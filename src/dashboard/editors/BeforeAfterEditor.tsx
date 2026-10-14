'use client'
/**
 * Before and after cases for the treatment pages. A case only appears on the website
 * when it is published and every consent box is ticked; the screen says what is missing.
 */
import React, { useState } from 'react'
import { api } from '../lib/client'
import { Notice, Select, TextArea, TextInput, Toggle, useUnsavedWarning } from '../ui/fields'
import { ImageSlot } from '../ui/MediaPicker'
import { PublishButton } from '../ui/PublishButton'
import { useToast } from '../ui/Toast'
import { Icon } from '../ui/icons'

export type CaseRow = {
  id?: number | string; tmp?: string; ref: string; page: string; title: string
  before: string; beforeMedia: number | string | null; beforeAlt: string
  after: string; afterMedia: number | string | null; afterAlt: string
  caption: string; consentDocumented: boolean; consentDate: string; consentRecord: string
  unedited: boolean; consistentLighting: boolean; published: boolean; order: number
}

const keyOf = (c: CaseRow) => String(c.id ?? c.tmp)

/** What still stops a case from showing, in plain words. */
export function missing(c: CaseRow): string[] {
  const out: string[] = []
  if (!c.before) out.push('before photo')
  if (!c.after) out.push('after photo')
  if (!c.consentDocumented) out.push('documented consent')
  if (!c.unedited) out.push('unedited photos confirmed')
  if (!c.consistentLighting) out.push('consistent lighting confirmed')
  if (!c.published) out.push('Show on the website switched on')
  return out
}

export function BeforeAfterEditor({ initial, pages }: { initial: CaseRow[]; pages: { key: string; label: string; url: string }[] }) {
  const toast = useToast()
  const [rows, setRows] = useState<CaseRow[]>(initial)
  const [removed, setRemoved] = useState<(number | string)[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  useUnsavedWarning(dirty)
  const pageName = (k: string) => pages.find((p) => p.key === k)?.label || k || 'No page chosen'
  const change = (k: string, p: Partial<CaseRow>) => { setRows((r) => r.map((c) => (keyOf(c) === k ? { ...c, ...p } : c))); setDirty(true) }

  function add() {
    const tmp = `new-${Date.now()}`
    setRows((r) => [...r, {
      tmp, ref: '', page: pages[0]?.key || '', title: '', before: '', beforeMedia: null, beforeAlt: '', after: '', afterMedia: null, afterAlt: '',
      caption: '', consentDocumented: false, consentDate: '', consentRecord: '', unedited: false, consistentLighting: false, published: false, order: r.length + 1,
    }])
    setOpen(tmp)
    setDirty(true)
  }
  function remove(c: CaseRow) {
    if (!window.confirm(`Delete "${c.title || 'this case'}"? The photos stay in the Media Library.`)) return
    if (c.id) setRemoved((r) => [...r, c.id!])
    setRows((r) => r.filter((x) => keyOf(x) !== keyOf(c)))
    setDirty(true)
  }
  function move(c: CaseRow, d: -1 | 1) {
    const i = rows.findIndex((x) => keyOf(x) === keyOf(c)), j = i + d
    if (j < 0 || j >= rows.length) return
    const next = [...rows]; [next[i], next[j]] = [next[j], next[i]]
    setRows(next); setDirty(true)
  }
  async function save() {
    if (rows.some((c) => !c.title.trim())) { toast('Every case needs a title, for example "Porcelain veneers, upper front teeth".', 'bad'); return }
    if (rows.some((c) => !c.page)) { toast('Choose the treatment page for every case.', 'bad'); return }
    setBusy(true)
    try {
      for (const id of removed) await api(`/api/before-after/${id}`, { method: 'DELETE' })
      const next: CaseRow[] = []
      for (const [i, c] of rows.entries()) {
        const data = {
          page: c.page, title: c.title.trim(), before: c.before, beforeMedia: c.beforeMedia ?? null, beforeAlt: c.beforeAlt,
          after: c.after, afterMedia: c.afterMedia ?? null, afterAlt: c.afterAlt, caption: c.caption,
          consentDocumented: c.consentDocumented, consentDate: c.consentDate, consentRecord: c.consentRecord,
          unedited: c.unedited, consistentLighting: c.consistentLighting, published: c.published, order: i + 1,
        }
        if (c.id) {
          await api(`/api/before-after/${c.id}?depth=0`, { method: 'PATCH', body: data })
          next.push({ ...c, order: i + 1 })
        } else {
          const ref = `case-${Date.now().toString(36)}-${i}`
          const r = await api<{ doc: { id: number } }>('/api/before-after?depth=0', { method: 'POST', body: { ...data, ref } })
          next.push({ ...c, id: r.doc.id, ref, tmp: undefined, order: i + 1 })
        }
      }
      // keep the case that was open still open once it has its database id
      const was = rows.findIndex((c) => keyOf(c) === open)
      if (was >= 0 && next[was]) setOpen(keyOf(next[was]))
      setRows(next); setRemoved([]); setDirty(false)
      toast('Saved. Press Publish website to update the treatment pages.', 'good')
    } catch (e) {
      toast((e as Error).message, 'bad')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Notice tone="info" icon={Icon.info()}>
        <p><b>AHPRA rules for before and after photos.</b> Only real patients of the practice, with their written consent to use the photos in advertising kept on file. The photos must not be edited or retouched, and the before and after photos must be taken with the same lighting, angle and distance. No stock photos, and nothing presented as a result that is not one. Every gallery shows the risk statement: Any invasive procedure carries risks. Results vary between individuals. Seek a second opinion from an appropriately qualified health practitioner before proceeding.</p>
      </Notice>
      {!rows.length ? <div className="panel"><p className="help">No cases yet. The galleries stay out of sight on every treatment page until a case is added and ready.</p></div> : null}
      <div className="sections">
        {rows.map((c, i) => {
          const k = keyOf(c), gaps = missing(c), live = gaps.length === 0
          return (
            <div key={k} className={`sec${open === k ? ' open' : ''}`}>
              <div className="sec-head" onClick={() => setOpen(open === k ? null : k)}>
                {c.after ? <img src={c.after} alt="" style={{ width: 44, height: 33, borderRadius: 6, objectFit: 'cover' }} /> : null}
                <span className="sec-title">{c.title || 'New case'} <span className="help" style={{ fontWeight: 400 }}>{pageName(c.page)}</span></span>
                {live ? <span className="chip good">On the website</span> : <span className="chip warn" title={`Missing: ${gaps.join(', ')}`}>Not shown</span>}
                <button type="button" className="btn small ghost" aria-label="Move up" disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(c, -1) }}>{Icon.arrowUp()}</button>
                <button type="button" className="btn small ghost" aria-label="Move down" disabled={i === rows.length - 1} onClick={(e) => { e.stopPropagation(); move(c, 1) }}>{Icon.arrowDown()}</button>
                <span className="chev">{Icon.chevron()}</span>
              </div>
              {open === k ? (
                <div className="sec-body">
                  {!live ? <Notice tone="warn" icon={Icon.info()}><p>Not on the website yet. Still needed: {gaps.join(', ')}.</p></Notice> : null}
                  <div className="row">
                    <Select label="Treatment page" value={c.page} onChange={(v) => change(k, { page: v })} options={pages.map((p) => ({ value: p.key, label: p.label }))} />
                    <TextInput label="Title" value={c.title} onChange={(v) => change(k, { title: v })} placeholder="Porcelain veneers, upper front teeth" />
                  </div>
                  <div className="row">
                    <div>
                      <ImageSlot label="Before photo" value={c.before} onChange={(v) => change(k, { before: v.value, beforeMedia: v.media })} />
                      <TextInput label="Before photo description (alt text)" value={c.beforeAlt} onChange={(v) => change(k, { beforeAlt: v })} placeholder="Upper front teeth before porcelain veneers" />
                    </div>
                    <div>
                      <ImageSlot label="After photo" value={c.after} onChange={(v) => change(k, { after: v.value, afterMedia: v.media })} />
                      <TextInput label="After photo description (alt text)" value={c.afterAlt} onChange={(v) => change(k, { afterAlt: v })} placeholder="The same teeth after porcelain veneers" />
                    </div>
                  </div>
                  <TextArea label="Caption (optional)" value={c.caption} onChange={(v) => change(k, { caption: v })}
                    help="Facts only: the treatment and how long it took, for example Six porcelain veneers over two appointments. No promises about results." />
                  <h3 style={{ margin: '18px 0 8px' }}>Consent and photo checks</h3>
                  <Toggle label="Written consent to use these photos in advertising is on file" checked={c.consentDocumented} onChange={(v) => change(k, { consentDocumented: v })} />
                  <div className="row">
                    <TextInput label="Date consent was given" type="date" value={c.consentDate} onChange={(v) => change(k, { consentDate: v })} />
                    <TextInput label="Where the consent form is kept" value={c.consentRecord} onChange={(v) => change(k, { consentRecord: v })} placeholder="Patient file, scanned consent form" help="Never the patient's name: the website never shows this." />
                  </div>
                  <Toggle label="The photos have not been edited or retouched" checked={c.unedited} onChange={(v) => change(k, { unedited: v })} />
                  <Toggle label="Before and after were taken with the same lighting, angle and distance" checked={c.consistentLighting} onChange={(v) => change(k, { consistentLighting: v })} />
                  <Toggle label="Show on the website" checked={c.published} onChange={(v) => change(k, { published: v })} />
                  <button className="btn danger small" onClick={() => remove(c)}>{Icon.trash()} Delete this case</button>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="actions">
          <button className="btn" onClick={add} disabled={!pages.length}>{Icon.plus()} Add a case</button>
          <span style={{ flex: 1 }} />
          <span className="help" style={{ color: dirty ? 'var(--pd-warn)' : undefined }}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
          <button className="btn primary" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving...' : 'Save cases'}</button>
          <PublishButton />
        </div>
      </div>
    </>
  )
}


