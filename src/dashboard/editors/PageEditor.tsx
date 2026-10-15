'use client'
/**
 * The page editor: each section of the page as a collapsed row with a readable
 * name. Drag rows to reorder, open a row to edit its headings, paragraphs,
 * buttons, links and photos. The SEO tab holds the page's Google details.
 */
import React, { useMemo, useState } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Field as F, Section } from '../../render/types'
import { api } from '../lib/client'
import { linkForEditing, linkForSaving, textForEditing, textForSaving } from '../lib/text'
import { AutoTextarea, Notice, useUnsavedWarning } from '../ui/fields'
import { ImageSlot } from '../ui/MediaPicker'
import { RichInline } from '../ui/RichInline'
import { SeoPanel, type SeoState } from '../ui/SeoPanel'
import { PublishButton } from '../ui/PublishButton'
import { useToast } from '../ui/Toast'
import { Icon } from '../ui/icons'

type BlockDoc = { id: number | string; key: string; label: string; template: string; fields: F[] }
export type PageEditorProps = {
  id: number | string
  label: string
  url: string | null
  model: { file: string; layout: unknown; tail: string; sections: Section[] }
  seo: SeoState
  blocks: BlockDoc[]
  defaultOg: string
  defaultTitle: string
  lastmod: string | null
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

const HELP: Partial<Record<F['type'], string>> = {
  link: 'A page on this website starts with /, for example /contact/. Other websites start with https://',
  alt: 'Describe the photo for someone who cannot see it. Leave it blank only if the photo is decoration.',
}

function groupTitle(group: string, fields: F[]): string {
  const parts = group.split('.')
  const n = parts[parts.length - 1]
  if (fields.some((f) => f.label === 'Question')) return `Question ${n}`
  return parts.length > 1 ? `Item ${parts.join(', part ')}` : `Item ${n}`
}

/** Fields with their display label (Paragraph 2 and so on) and grouped into item boxes. */
function layoutFields(fields: F[]) {
  const out: { group: string | null; fields: { f: F; label: string }[] }[] = []
  for (const f of fields) {
    const g = f.group ?? null
    const last = out[out.length - 1]
    if (last && last.group === g) last.fields.push({ f, label: f.label })
    else out.push({ group: g, fields: [{ f, label: f.label }] })
  }
  for (const box of out) {
    const counts: Record<string, number> = {}
    for (const x of box.fields) counts[x.f.label] = (counts[x.f.label] ?? 0) + 1
    const seen: Record<string, number> = {}
    for (const x of box.fields) {
      if (counts[x.f.label] > 1 && x.f.type !== 'alt') {
        seen[x.f.label] = (seen[x.f.label] ?? 0) + 1
        x.label = `${x.f.label} ${seen[x.f.label]}`
      }
    }
  }
  return out
}

function FieldEditor({ f, label, onChange, prefix }: { f: F; label: string; onChange: (patch: Partial<F>) => void; prefix: string }) {
  const id = `fld-${prefix}-${f.id}`
  if (f.type === 'image') {
    return <ImageSlot label={label} value={f.value} original={(f as F & { original?: string }).original ?? f.value}
      onChange={(v) => onChange({ value: v.value, media: v.media ?? undefined })} />
  }
  if (f.type === 'rich') {
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <RichInline id={id} value={f.value} onChange={(html) => onChange({ value: html })} />
      </div>
    )
  }
  if (f.type === 'link') {
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <input id={id} className="input" value={linkForEditing(f.value)} onChange={(e) => onChange({ value: linkForSaving(e.target.value) })} />
        <div className="help">{HELP.link}</div>
      </div>
    )
  }
  const text = textForEditing(f.value)
  const long = text.length > 70 || text.includes('\n')
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {long
        ? <AutoTextarea id={id} value={text} onChange={(v) => onChange({ value: textForSaving(v) })} />
        : <input id={id} className="input" value={text} onChange={(e) => onChange({ value: textForSaving(e.target.value) })} />}
      {f.type === 'alt' ? <div className="help">{HELP.alt}</div> : null}
    </div>
  )
}

function FieldsList({ fields, onField, prefix }: { fields: F[]; onField: (id: string, patch: Partial<F>) => void; prefix: string }) {
  const boxes = useMemo(() => layoutFields(fields), [fields])
  if (!fields.length) return <p className="help">Nothing to edit in this section.</p>
  return (
    <>
      {boxes.map((b, i) => {
        const inner = b.fields.map(({ f, label }) => (
          <FieldEditor key={f.id} f={f} label={label} prefix={prefix} onChange={(p) => onField(f.id, p)} />
        ))
        return b.group
          ? <div key={i} className="item-box"><div className="item-title">{groupTitle(b.group, b.fields.map((x) => x.f))}</div>{inner}</div>
          : <React.Fragment key={i}>{inner}</React.Fragment>
      })}
    </>
  )
}

function SectionRow({ s, open, onToggle, onHide, children, sortable }: {
  s: Section; open: boolean; onToggle: () => void; onHide?: () => void; children: React.ReactNode; sortable: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.key, disabled: !sortable })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const badge = s.shared ? <span className="chip blue">Same on every page</span>
    : s.generated ? <span className="chip grey">Fills in automatically</span>
      : s.pinned ? <span className="chip grey">Stays at the top</span> : null
  return (
    <div ref={setNodeRef} style={style} className={`sec${open ? ' open' : ''}${isDragging ? ' dragging' : ''}${s.hidden ? ' is-hidden' : ''}`}>
      <div className="sec-head" onClick={onToggle}>
        <button type="button" className="handle" aria-label={sortable ? `Drag to move ${s.label}` : 'This section cannot be moved'}
          disabled={!sortable} {...(sortable ? attributes : {})} {...(sortable ? listeners : {})} onClick={(e) => e.stopPropagation()}>
          {Icon.grip()}
        </button>
        <span className="sec-title">{s.label || (s.shared === 'cta' ? 'Book Your Visit band' : s.shared === 'contact' ? 'Enquiry form and map' : 'Section')}</span>
        {s.hidden ? <span className="chip warn">Hidden</span> : badge}
        {onHide ? (
          <button type="button" className="btn small ghost" onClick={(e) => { e.stopPropagation(); onHide() }}
            title={s.hidden ? 'Show this section on the page' : 'Hide this section from the page'}>
            {s.hidden ? Icon.eye() : Icon.eyeOff()} {s.hidden ? 'Show' : 'Hide'}
          </button>
        ) : null}
        <span className="chev">{Icon.chevron()}</span>
      </div>
      {open ? <div className="sec-body">{children}</div> : null}
    </div>
  )
}

export function PageEditor(props: PageEditorProps) {
  const toast = useToast()
  const [sections, setSections] = useState<Section[]>(() => clone(props.model.sections))
  const [blocks, setBlocks] = useState<BlockDoc[]>(() => clone(props.blocks))
  const [dirtyBlocks, setDirtyBlocks] = useState<Set<string>>(new Set())
  const [seo, setSeo] = useState<SeoState>(props.seo)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'content' | 'seo'>('content')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  useUnsavedWarning(dirty)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const pinned = sections.filter((s) => s.pinned)
  const movable = sections.filter((s) => !s.pinned)

  const touch = () => { setDirty(true); setSaved(false) }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = movable.findIndex((s) => s.key === active.id)
    const to = movable.findIndex((s) => s.key === over.id)
    setSections([...pinned, ...arrayMove(movable, from, to)])
    touch()
  }

  function setField(secKey: string, fid: string, patch: Partial<F>) {
    setSections((all) => all.map((s) => {
      if (s.key !== secKey) return s
      return {
        ...s,
        fields: (s.fields || []).map((f) => {
          if (f.id !== fid) return f
          const next = { ...f, ...patch } as F & { original?: string }
          if (f.type === 'image' && (f as F & { original?: string }).original === undefined && patch.value !== undefined) next.original = f.value
          if (f.type === 'image' && patch.media === undefined && 'media' in patch) delete next.media
          if (f.type === 'image' && next.original === next.value && !next.media) delete next.original
          return next
        }),
      }
    }))
    touch()
  }

  function setBlockField(key: string, fid: string, patch: Partial<F>) {
    setBlocks((all) => all.map((b) => b.key !== key ? b : { ...b, fields: b.fields.map((f) => (f.id === fid ? { ...f, ...patch } : f)) }))
    setDirtyBlocks((d) => new Set(d).add(key))
    touch()
  }

  async function save() {
    setSaving(true)
    try {
      await api(`/api/pages/${props.id}?depth=0`, {
        method: 'PATCH',
        body: {
          model: JSON.stringify({ file: props.model.file, layout: props.model.layout, tail: props.model.tail, sections }),
          seoTitle: seo.title, seoDescription: seo.description, ogImage: seo.ogImage,
          ogImageMedia: seo.ogImageMedia ?? null, canonical: seo.canonical, noindex: seo.noindex,
        },
      })
      for (const b of blocks.filter((x) => dirtyBlocks.has(x.key))) {
        await api(`/api/shared-blocks/${b.id}?depth=0`, { method: 'PATCH', body: { model: JSON.stringify({ template: b.template, fields: b.fields }) } })
      }
      setDirty(false)
      setDirtyBlocks(new Set())
      setSaved(true)
      toast('Saved. Press Publish website when you are ready for it to go live.', 'good')
    } catch (e) {
      toast((e as Error).message, 'bad')
    } finally {
      setSaving(false)
    }
  }

  const renderBody = (s: Section) => {
    if (s.shared) {
      const b = blocks.find((x) => x.key === s.shared)
      if (!b) return <p className="help">This shared section is missing.</p>
      return (
        <>
          <Notice tone="info" icon={Icon.info()}><p>This section is the same on every page that shows it. Changes here update all of those pages.</p></Notice>
          <FieldsList prefix={`b-${b.key}`} fields={b.fields} onField={(fid, p) => setBlockField(b.key, fid, p)} />
        </>
      )
    }
    return (
      <>
        {s.generated === 'team' ? <Notice tone="info" icon={Icon.info()}><p>The team cards come from the <a href="/admin/team">Team</a> screen. The heading above them can be changed here.</p></Notice> : null}
        {s.generated === 'articleIndex' ? <Notice tone="info" icon={Icon.info()}><p>This list fills in from <a href="/admin/posts">Blog Posts</a>. Publishing a post adds it here.</p></Notice> : null}
        {s.generated === 'beforeAfter' ? <Notice tone="info" icon={Icon.info()}><p>The photos come from the <a href="/admin/before-after">Before &amp; After</a> screen. This gallery stays off the page until it has a case with consent recorded. The risk statement below is always shown with the photos.</p></Notice> : null}
        {/\{\{site:offer(Banner|Section|Terms)\}\}/.test(s.template || '') ? <Notice tone="info" icon={Icon.info()}><p>The price, inclusions, dates and terms of the new patient offer are set once in <a href="/admin/settings#offer">Site Settings, New patient offer</a>, and update everywhere the offer appears.</p></Notice> : null}
        {(s.template || '').includes('{{site:reviewsBand}}') ? <Notice tone="info" icon={Icon.info()}><p>The number of reviews, the star rating, the Google logo and the link are set in <a href="/admin/settings#reviews">Site Settings, Google reviews band</a>.</p></Notice> : null}
        {(s.template || '').includes('{{site:priceListForm}}') ? <Notice tone="info" icon={Icon.info()}><p>The price list form, its consent wording and thank-you message are set in <a href="/admin/settings#pricelist">Site Settings, Price list</a>.</p></Notice> : null}
        {s.generated === 'sitemapArticles' ? <Notice tone="info" icon={Icon.info()}><p>The Dental Articles column fills in from <a href="/admin/posts">Blog Posts</a>.</p></Notice> : null}
        <FieldsList prefix={s.key} fields={s.fields || []} onField={(fid, p) => setField(s.key, fid, p)} />
      </>
    )
  }

  const toggle = (k: string) => setOpen((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const hide = (k: string) => { setSections((all) => all.map((s) => (s.key === k ? { ...s, hidden: !s.hidden } : s))); touch() }
  const previewHref = `/admin/preview/page/${props.id}`

  return (
    <div className="cols">
      <div>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'content'} className={tab === 'content' ? 'on' : ''} onClick={() => setTab('content')}>Content</button>
          <button role="tab" aria-selected={tab === 'seo'} className={tab === 'seo' ? 'on' : ''} onClick={() => setTab('seo')}>SEO</button>
        </div>
        {tab === 'content' ? (
          <>
            <p className="help" style={{ marginBottom: 12 }}>Open a section to edit it. Drag the dots to change the order. Words in curly brackets, like <span className="kbd">{'{phone}'}</span>, fill in from Site Settings.</p>
            <div className="sections">
              {pinned.map((s) => (
                <SectionRow key={s.key} s={s} open={open.has(s.key)} onToggle={() => toggle(s.key)} sortable={false}>{renderBody(s)}</SectionRow>
              ))}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={movable.map((s) => s.key)} strategy={verticalListSortingStrategy}>
                  {movable.map((s) => (
                    <SectionRow key={s.key} s={s} sortable open={open.has(s.key)} onToggle={() => toggle(s.key)} onHide={() => hide(s.key)}>{renderBody(s)}</SectionRow>
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </>
        ) : (
          <div className="panel">
            <SeoPanel seo={seo} onChange={(s) => { setSeo(s); touch() }} url={props.url || '/'} defaultOg={props.defaultOg} titleHint={props.defaultTitle} />
          </div>
        )}
      </div>
      <div className="sticky">
        <div className="panel">
          <h2 style={{ marginBottom: 10 }}>Save and publish</h2>
          <p className={dirty ? '' : 'help'} style={{ color: dirty ? 'var(--pd-warn)' : undefined, fontWeight: dirty ? 600 : 400 }}>
            {dirty ? 'You have unsaved changes.' : saved ? 'All changes saved.' : 'No changes yet.'}
          </p>
          <div className="actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <button className="btn primary" disabled={!dirty || saving} onClick={save}>{saving ? 'Saving...' : 'Save changes'}</button>
            <a className="btn" href={previewHref} target="_blank" rel="noopener" onClick={(e) => { if (dirty) { e.preventDefault(); toast('Save your changes first, then preview.', 'bad') } }}>{Icon.eye()} Preview</a>
            {props.url ? <a className="btn" href={props.url} target="_blank" rel="noopener">{Icon.external()} View live page</a> : null}
            <PublishButton />
          </div>
          <p className="help" style={{ marginTop: 12 }}>Saving keeps your changes in the dashboard. Publish website puts every saved change live, usually within two minutes.</p>
        </div>
        {props.lastmod ? <p className="help">Last changed {props.lastmod}.</p> : null}
      </div>
    </div>
  )
}
