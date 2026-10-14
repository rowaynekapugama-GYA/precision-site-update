'use client'
/**
 * Every photo uploaded through the dashboard, plus the website's own photos.
 * Replacing a library photo updates every page that uses it. A website photo can
 * be replaced everywhere it appears (pages, menus and share images) in one go.
 */
import React, { useMemo, useState } from 'react'
import { api, mediaSrc, replaceMedia, uploadMedia, MAX_UPLOAD_MB } from '../lib/client'
import { DropZone, useMediaList, type MediaDoc } from '../ui/MediaPicker'
import { Modal, Notice, TextInput } from '../ui/fields'
import { PublishButton } from '../ui/PublishButton'
import { useToast } from '../ui/Toast'
import { Icon } from '../ui/icons'

type Replacement = { from: string; to: string; media?: number | string | null }

function kb(n?: number) {
  if (!n) return ''
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`
}

function LibraryItem({ doc, onClose, onSaved, onDeleted }: { doc: MediaDoc; onClose: () => void; onSaved: (d: MediaDoc) => void; onDeleted: () => void }) {
  const toast = useToast()
  const [alt, setAlt] = useState(doc.alt || '')
  const [busy, setBusy] = useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const src = mediaSrc(doc)
  async function saveAlt() {
    setBusy(true)
    try {
      const r = await api<{ doc: MediaDoc }>(`/api/media/${doc.id}?depth=0`, { method: 'PATCH', body: { alt } })
      onSaved(r.doc)
      toast('Saved.', 'good')
    } catch (e) { toast((e as Error).message, 'bad') } finally { setBusy(false) }
  }
  async function replace(f?: File) {
    if (!f) return
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) { toast(`That photo is larger than ${MAX_UPLOAD_MB} MB.`, 'bad'); return }
    setBusy(true)
    try {
      const d = await replaceMedia(doc.id, f)
      onSaved(d)
      toast('Photo replaced everywhere it is used. Publish website to put it live.', 'good')
    } catch (e) { toast((e as Error).message, 'bad') } finally { setBusy(false) }
  }
  async function remove() {
    if (!window.confirm('Delete this photo? Any page still using it will lose the photo the next time you publish.')) return
    setBusy(true)
    try {
      await api(`/api/media/${doc.id}`, { method: 'DELETE' })
      onDeleted()
      toast('Photo deleted.', 'good')
    } catch (e) { toast((e as Error).message, 'bad'); setBusy(false) }
  }
  return (
    <Modal title={doc.filename || 'Photo'} onClose={onClose} footer={<>
      <button className="btn danger" disabled={busy} onClick={remove}>{Icon.trash()} Delete</button>
      <span style={{ flex: 1 }} />
      <button className="btn" onClick={onClose}>Close</button>
      <button className="btn primary" disabled={busy} onClick={saveAlt}>Save description</button>
    </>}>
      <div className="grid-2">
        <div><img src={src} alt="" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--pd-line)' }} /></div>
        <div>
          <p className="help">{doc.width} by {doc.height} pixels, {kb(doc.filesize)}. Uploaded {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-AU') : ''}.</p>
          <TextInput label="Default description (alt text)" value={alt} onChange={setAlt} help="Used when this photo is added to a page or post. Each page can still have its own." />
          <div className="field"><span className="lab">Replace this photo</span>
            <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>{Icon.upload()} Upload a replacement</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { replace(e.target.files?.[0]); e.target.value = '' }} />
            <div className="help">The new photo takes this one&apos;s place on every page that uses it.</div></div>
          <div className="field"><span className="lab">Address</span><input className="input" readOnly value={src} onFocus={(e) => e.target.select()} /></div>
        </div>
      </div>
    </Modal>
  )
}

function SitePhoto({ path, rep, onReplace, onRestore }: { path: string; rep?: Replacement; onReplace: (f: File) => void; onRestore: () => void }) {
  const ref = React.useRef<HTMLInputElement>(null)
  return (
    <div className="media-tile" style={{ cursor: 'default' }}>
      <div className="im" style={{ backgroundImage: `url("${rep?.to || path}")` }} />
      <div className="cap" title={path}>{path.replace('/assets/img/', '')}</div>
      <div style={{ padding: '0 8px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn small" onClick={() => ref.current?.click()}>{rep ? 'Change' : 'Replace everywhere'}</button>
        {rep ? <button className="btn small ghost" onClick={onRestore}>Put back</button> : null}
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onReplace(f); e.target.value = '' }} />
      </div>
    </div>
  )
}

export function MediaLibrary({ sitePhotos, replacements: initialReps }: { sitePhotos: string[]; replacements: Replacement[] }) {
  const toast = useToast()
  const [tab, setTab] = useState<'library' | 'site'>('library')
  const { docs, setDocs, loading, more, loadMore } = useMediaList(true)
  const [sel, setSel] = useState<MediaDoc | null>(null)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [reps, setReps] = useState<Replacement[]>(initialReps)

  async function upload(files: File[]) {
    if (!files.length) return
    setBusy(true)
    let n = 0
    try {
      for (const f of files) {
        if (f.size > MAX_UPLOAD_MB * 1024 * 1024) { toast(`${f.name} is larger than ${MAX_UPLOAD_MB} MB.`, 'bad'); continue }
        const d = await uploadMedia(f, '')
        setDocs((x) => [d, ...x])
        n++
      }
      if (n) toast(n === 1 ? 'Photo uploaded.' : `${n} photos uploaded.`, 'good')
    } catch (e) { toast((e as Error).message, 'bad') } finally { setBusy(false) }
  }

  async function saveReps(next: Replacement[], msg: string) {
    await api('/api/globals/site-settings?depth=0', { method: 'POST', body: { imageReplacements: next.map((r) => ({ from: r.from, to: r.to, media: r.media ?? null })) } })
    setReps(next)
    toast(msg, 'good')
  }
  async function replaceSite(path: string, f: File) {
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) { toast(`That photo is larger than ${MAX_UPLOAD_MB} MB.`, 'bad'); return }
    setBusy(true)
    try {
      const d = await uploadMedia(f, '')
      setDocs((x) => [d, ...x])
      const next = [...reps.filter((r) => r.from !== path), { from: path, to: mediaSrc(d), media: d.id }]
      await saveReps(next, 'Photo replaced everywhere it appears. Publish website to put it live.')
    } catch (e) { toast((e as Error).message, 'bad') } finally { setBusy(false) }
  }
  async function restoreSite(path: string) {
    try { await saveReps(reps.filter((r) => r.from !== path), 'The original photo is back. Publish website to put it live.') } catch (e) { toast((e as Error).message, 'bad') }
  }

  const shown = useMemo(() => docs.filter((d) => !q || `${d.alt} ${d.filename}`.toLowerCase().includes(q.toLowerCase())), [docs, q])
  const site = useMemo(() => sitePhotos.filter((p) => !q || p.toLowerCase().includes(q.toLowerCase())), [sitePhotos, q])
  const repOf = (p: string) => reps.find((r) => r.from === p)

  return (
    <>
      <div className="tabs" role="tablist">
        <button className={tab === 'library' ? 'on' : ''} onClick={() => setTab('library')}>Uploaded photos</button>
        <button className={tab === 'site' ? 'on' : ''} onClick={() => setTab('site')}>Website photos</button>
        <span style={{ flex: 1 }} />
        <input className="input search" placeholder="Search photos" value={q} onChange={(e) => setQ(e.target.value)} style={{ alignSelf: 'center', marginBottom: 6 }} />
      </div>
      {tab === 'library' ? (
        <>
          <DropZone onFiles={upload} label={busy ? 'Uploading...' : 'Drag photos here, or'} />
          {loading && !docs.length ? <p className="empty">Loading...</p> : null}
          {!loading && !docs.length ? <p className="empty">No photos uploaded yet.</p> : null}
          <div className="media-grid">
            {shown.map((d) => (
              <button key={d.id} className="media-tile" onClick={() => setSel(d)}>
                <div className="im" style={{ backgroundImage: `url("${mediaSrc(d, 'thumb')}")` }} />
                <div className="cap">{d.alt || d.filename}</div>
              </button>
            ))}
          </div>
          {more ? <p style={{ textAlign: 'center', marginTop: 12 }}><button className="btn" onClick={loadMore}>Show more</button></p> : null}
        </>
      ) : (
        <>
          <Notice tone="info" icon={Icon.info()}>
            <p>These are the photos the website was built with. Replace one and the new photo appears everywhere the old one did, including the menu and share images. Put back restores the original.</p>
          </Notice>
          <div className="actions" style={{ marginBottom: 12 }}><span className="help">{reps.length} replaced</span><span style={{ flex: 1 }} /><PublishButton /></div>
          <div className="media-grid">
            {site.slice(0, 400).map((p) => (
              <SitePhoto key={p} path={p} rep={repOf(p)} onReplace={(f) => replaceSite(p, f)} onRestore={() => restoreSite(p)} />
            ))}
          </div>
        </>
      )}
      {sel ? (
        <LibraryItem doc={sel} onClose={() => setSel(null)}
          onSaved={(d) => { setDocs((x) => x.map((y) => (y.id === d.id ? d : y))); setSel((cur) => (cur && cur.id === d.id ? d : cur)) }}
          onDeleted={() => { setDocs((x) => x.filter((y) => y.id !== sel.id)); setSel(null) }} />
      ) : null}
    </>
  )
}
