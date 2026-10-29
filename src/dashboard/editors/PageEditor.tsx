'use client'
/**
 * The page editor, laid out like the Coastal Dental dashboard (29 October 2026):
 * the page itself on the left, exactly as it looks on the website, where any words
 * can be clicked and changed in place and any photo clicked to replace it; a panel
 * on the right with Content (the selected item and every photo on the page), SEO,
 * and Sections (drag to reorder, hide or show, or open a section as a form).
 * Desktop and Mobile switch the preview width. Nothing goes live until Publish website.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Field as F, Section } from '../../render/types'
import { esc, tokensToFriendly } from '../../render/util'
import { api, mediaSrc } from '../lib/client'
import { cleanInlineHtml, linkForEditing, linkForSaving, textForEditing, textForSaving } from '../lib/text'
import { AutoTextarea, Notice, useUnsavedWarning } from '../ui/fields'
import { ImageSlot, MediaPicker, type MediaDoc } from '../ui/MediaPicker'
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

type Img = { ref: string; alt: string | null; link: string | null }
type Selected =
  | { kind: 'text'; ref: string; rich: boolean; link: string | null; section: string | null }
  | { kind: 'image'; ref: string; alt: string | null; link: string | null; section: string | null }
  | { kind: 'note'; title: string; body: React.ReactNode }
  | null

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const DESKTOP_WIDTH = 1280
const MOBILE_WIDTH = 390

const HELP: Partial<Record<F['type'], string>> = {
  link: 'A page on this website starts with /, for example /contact/. Other websites start with https://',
  alt: 'Describe the photo for someone who cannot see it. Leave it blank only if the photo is decoration.',
}

// ---------------------------------------------------------------- section forms (Sections tab)
function groupTitle(group: string, fields: F[]): string {
  const parts = group.split('.')
  const n = parts[parts.length - 1]
  if (fields.some((f) => f.label === 'Question')) return `Question ${n}`
  return parts.length > 1 ? `Item ${parts.join(', part ')}` : `Item ${n}`
}

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

const sectionName = (s: Section) =>
  s.label || (s.shared === 'cta' ? 'Book Your Visit band' : s.shared === 'contact' ? 'Enquiry form and map' : 'Section')

function SectionRow({ s, open, onToggle, onShow, onHide, children, sortable }: {
  s: Section; open: boolean; onToggle: () => void; onShow: () => void; onHide?: () => void; children: React.ReactNode; sortable: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.key, disabled: !sortable })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const badge = s.shared ? <span className="chip blue">Every page</span>
    : s.generated ? <span className="chip grey">Automatic</span>
      : s.pinned ? <span className="chip grey">Top</span> : null
  return (
    <div ref={setNodeRef} style={style} className={`sec${open ? ' open' : ''}${isDragging ? ' dragging' : ''}${s.hidden ? ' is-hidden' : ''}`}>
      <div className="sec-head" onClick={() => { onToggle(); onShow() }}>
        <button type="button" className="handle" aria-label={sortable ? `Drag to move ${sectionName(s)}` : 'This section cannot be moved'}
          disabled={!sortable} {...(sortable ? attributes : {})} {...(sortable ? listeners : {})} onClick={(e) => e.stopPropagation()}>
          {Icon.grip()}
        </button>
        <span className="sec-title">{sectionName(s)}</span>
        {s.hidden ? <span className="chip warn">Hidden</span> : badge}
        {onHide ? (
          <button type="button" className="btn small ghost icon-only" onClick={(e) => { e.stopPropagation(); onHide() }}
            title={s.hidden ? 'Show this section on the page' : 'Hide this section from the page'} aria-label={s.hidden ? `Show ${sectionName(s)}` : `Hide ${sectionName(s)}`}>
            {s.hidden ? Icon.eye() : Icon.eyeOff()}
          </button>
        ) : null}
        <span className="chev">{Icon.chevron()}</span>
      </div>
      {open ? <div className="sec-body">{children}</div> : null}
    </div>
  )
}

// ---------------------------------------------------------------- the editor
export function PageEditor(props: PageEditorProps) {
  const toast = useToast()
  const [sections, setSections] = useState<Section[]>(() => clone(props.model.sections))
  const [blocks, setBlocks] = useState<BlockDoc[]>(() => clone(props.blocks))
  const [dirtyBlocks, setDirtyBlocks] = useState<Set<string>>(new Set())
  const [seo, setSeo] = useState<SeoState>(props.seo)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'content' | 'seo' | 'sections'>('content')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selected, setSelected] = useState<Selected>(null)
  const [images, setImages] = useState<Img[]>([])
  const [loading, setLoading] = useState(true)
  const [previewError, setPreviewError] = useState('')
  const [pickFor, setPickFor] = useState<string | null>(null)
  const [stage, setStage] = useState({ w: 0, h: 0 })
  useUnsavedWarning(dirty)

  const frame = useRef<HTMLIFrameElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const live = useRef({ sections, blocks })
  live.current = { sections, blocks }
  const keepScroll = useRef(0)
  const request = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const range = useRef<Range | null>(null)
  const selRef = useRef<string | null>(null)
  const saveRef = useRef<() => void>(() => {})

  // the editor uses the whole width of the dashboard
  useEffect(() => {
    document.body.classList.add('pe-full')
    return () => document.body.classList.remove('pe-full')
  }, [])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setStage({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const touch = () => { setDirty(true); setSaved(false) }

  // ------------------------------------------------ field access by reference ("s:<section>|f3" or "b:<block>|f2")
  const parseRef = (ref: string) => {
    const [scope, fid] = ref.split('|')
    return { shared: scope.startsWith('b:'), key: scope.slice(2), fid }
  }
  const getField = useCallback((ref: string): F | null => {
    const { shared, key, fid } = parseRef(ref)
    const list = shared ? live.current.blocks.find((b) => b.key === key)?.fields : live.current.sections.find((s) => s.key === key)?.fields
    return list?.find((f) => f.id === fid) ?? null
  }, [])

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

  const setRef = (ref: string, patch: Partial<F>) => {
    const { shared, key, fid } = parseRef(ref)
    if (shared) setBlockField(key, fid, patch)
    else setField(key, fid, patch)
  }

  // ------------------------------------------------ the preview
  const refresh = useCallback(async () => {
    const n = ++request.current
    const win = frame.current?.contentWindow
    if (win) keepScroll.current = win.scrollY
    setLoading(true)
    try {
      const res = await fetch('/admin/preview/edit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: props.id,
          sections: live.current.sections,
          blocks: live.current.blocks.map((b) => ({ key: b.key, fields: b.fields })),
        }),
      })
      const html = await res.text()
      if (n !== request.current) return
      if (!res.ok) {
        let msg = 'The preview could not be loaded.'
        try { msg = JSON.parse(html).error || msg } catch { /* not JSON */ }
        setPreviewError(msg)
        setLoading(false)
        return
      }
      setPreviewError('')
      if (frame.current) frame.current.srcdoc = html
    } catch {
      if (n === request.current) { setPreviewError('The preview could not be loaded. Check your internet connection.'); setLoading(false) }
    }
  }, [props.id])

  // a refresh runs after React has rendered the new state, so the preview never shows the old one
  const [tick, setTick] = useState(0)
  const bump = useCallback(() => setTick((t) => t + 1), [])
  const scheduleRefresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(bump, 400)
  }, [bump])

  useEffect(() => { refresh() }, [refresh, tick])

  const doc = () => frame.current?.contentDocument ?? null

  function markSelected(ref: string | null) {
    selRef.current = ref
    const d = doc()
    if (!d) return
    d.querySelectorAll('.pd-sel').forEach((el) => el.classList.remove('pd-sel'))
    if (ref) d.querySelectorAll(`img[data-pdi="${CSS_escape(ref)}"]`).forEach((el) => el.classList.add('pd-sel'))
  }

  const sectionOf = (el: Element): string | null => {
    const host = el.closest('[data-pds]')
    if (!host) return null
    const k = host.getAttribute('data-pds') || ''
    if (k.startsWith('b:')) {
      const s = live.current.sections.find((x) => x.shared === k.slice(2))
      return s ? sectionName(s) : null
    }
    const s = live.current.sections.find((x) => x.key === k)
    return s ? sectionName(s) : null
  }

  function readEditable(el: HTMLElement): string {
    const c = el.cloneNode(true) as HTMLElement
    c.querySelectorAll('.pd-tok').forEach((t) => {
      t.replaceWith(c.ownerDocument.createTextNode(tokensToFriendly(`{{site:${t.getAttribute('data-pdt')}}}`)))
    })
    if (el.getAttribute('data-t') === 'rich') return cleanInlineHtml(c)
    return textForSaving(c.textContent || '')
  }

  function scrollToSection(s: Section) {
    const d = doc()
    if (!d) return
    const el = d.querySelector(`[data-pds="${s.shared ? `b:${s.shared}` : s.key}"]`) as HTMLElement | null
    if (!el) {
      if (s.hidden) toast('This section is hidden, so it is not on the page. Press the eye to show it.', 'bad')
      return
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    el.classList.remove('pd-flash')
    void el.offsetWidth
    el.classList.add('pd-flash')
  }

  function noteFor(target: Element): Selected {
    const host = target.closest('[data-pds]')
    if (!host) {
      return {
        kind: 'note', title: 'Menu and footer',
        body: <p>The menu and footer are the same on every page. Phone, address, hours and social links in them come from <a href="/admin/settings">Site Settings</a>. For other changes, ask GYA.</p>,
      }
    }
    const k = host.getAttribute('data-pds') || ''
    const s = live.current.sections.find((x) => x.key === k)
    if (s?.generated === 'team') return { kind: 'note', title: 'Team cards', body: <p>The team cards come from the <a href="/admin/team">Team</a> screen. The heading above them can be clicked and changed here.</p> }
    if (s?.generated === 'articleIndex' || s?.generated === 'sitemapArticles') return { kind: 'note', title: 'Blog list', body: <p>This list fills in from <a href="/admin/posts">Blog Posts</a>. Publishing a post adds it here.</p> }
    if (s?.generated === 'beforeAfter') return { kind: 'note', title: 'Before and after photos', body: <p>The photos come from the <a href="/admin/before-after">Before &amp; After</a> screen.</p> }
    if (/\{\{site:offer(Banner|Section|Terms)\}\}/.test(s?.template || '')) return { kind: 'note', title: 'New patient offer', body: <p>The price, inclusions, dates and terms of the offer are set once in <a href="/admin/settings#offer">Site Settings, New patient offer</a>.</p> }
    if ((s?.template || '').includes('{{site:reviewsBand}}')) return { kind: 'note', title: 'Google reviews band', body: <p>The number of reviews, rating and link are set in <a href="/admin/settings#reviews">Site Settings, Google reviews band</a>.</p> }
    if ((s?.template || '').includes('{{site:priceListForm}}')) return { kind: 'note', title: 'Price list form', body: <p>The form, its consent wording and thank-you message are set in <a href="/admin/settings#pricelist">Site Settings, Price list</a>.</p> }
    return null
  }

  // ------------------------------------------------ wire up the page once it has loaded
  function onFrameLoad() {
    const d = doc()
    const win = frame.current?.contentWindow
    if (!d || !win || !d.body) return
    setLoading(false)
    win.scrollTo(0, keepScroll.current)

    // links and photos are not dragged around while words inside them are being selected
    d.querySelectorAll('a, img').forEach((el) => el.setAttribute('draggable', 'false'))
    d.querySelectorAll<HTMLElement>('pd-e').forEach((el) => {
      const rich = el.getAttribute('data-t') === 'rich'
      if (rich) el.contentEditable = 'true'
      else {
        try { el.contentEditable = 'plaintext-only' } catch { el.contentEditable = 'true' }
        if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true'
      }
      el.spellcheck = true
    })

    const list: Img[] = []
    const seen = new Set<string>()
    d.querySelectorAll('img[data-pdi]').forEach((img) => {
      const ref = img.getAttribute('data-pdi') || ''
      if (seen.has(ref)) return
      seen.add(ref)
      list.push({ ref, alt: img.getAttribute('data-pda'), link: img.closest('a[data-pdh]')?.getAttribute('data-pdh') ?? null })
    })
    setImages(list)
    markSelected(selRef.current)

    d.addEventListener('click', (e) => {
      const t = e.target as Element
      if (!t || !t.closest) return
      const link = t.closest('a')
      if (link) e.preventDefault()
      const tok = t.closest('.pd-tok')
      const ed = t.closest('pd-e') as HTMLElement | null
      const img = t.closest('img[data-pdi]')
      if (tok) {
        e.stopPropagation()
        setSelected({ kind: 'note', title: 'Practice details', body: <p>Shaded words such as the phone number fill in from <a href="/admin/settings">Site Settings</a>, so they stay the same everywhere on the website.</p> })
        setTab('content')
        return
      }
      if (ed) {
        e.stopPropagation()
        const ref = ed.getAttribute('data-pde') || ''
        markSelected(null)
        setSelected({ kind: 'text', ref, rich: ed.getAttribute('data-t') === 'rich', link: ed.closest('a[data-pdh]')?.getAttribute('data-pdh') ?? null, section: sectionOf(ed) })
        setTab('content')
        return
      }
      if (img) {
        e.stopPropagation()
        e.preventDefault()
        const ref = img.getAttribute('data-pdi') || ''
        markSelected(ref)
        setSelected({ kind: 'image', ref, alt: img.getAttribute('data-pda'), link: img.closest('a[data-pdh]')?.getAttribute('data-pdh') ?? null, section: sectionOf(img) })
        setTab('content')
        return
      }
      const note = noteFor(t)
      if (note && (link || t.closest('img, h1, h2, h3, h4, p, li, button'))) {
        setSelected(note)
        setTab('content')
      }
    }, true)

    d.addEventListener('submit', (e) => e.preventDefault(), true)

    d.addEventListener('input', (e) => {
      const el = (e.target as Element)?.closest?.('pd-e') as HTMLElement | null
      if (!el) return
      const ref = el.getAttribute('data-pde') || ''
      d.querySelectorAll<HTMLElement>('pd-e').forEach((o) => { if (o !== el && o.getAttribute('data-pde') === ref) o.innerHTML = el.innerHTML })
      setRef(ref, { value: readEditable(el) })
    }, true)

    d.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current(); return }
      const el = (e.target as Element)?.closest?.('pd-e') as HTMLElement | null
      if (!el) return
      if (e.key === 'Escape') { el.blur(); return }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey && el.getAttribute('data-t') === 'rich') d.execCommand('insertLineBreak')
      }
      // keep the space bar and Enter inside the words, not on a button around them
      if (e.key === ' ') e.stopPropagation()
    }, true)
    d.addEventListener('keyup', (e) => {
      if ((e.target as Element)?.closest?.('pd-e') && e.key === ' ') { e.stopPropagation(); e.preventDefault() }
    }, true)

    d.addEventListener('paste', (e) => {
      const el = (e.target as Element)?.closest?.('pd-e')
      if (!el) return
      e.preventDefault()
      const text = (e.clipboardData?.getData('text/plain') || '').replace(/\s*\n\s*/g, ' ')
      d.execCommand('insertText', false, text)
    }, true)

    d.addEventListener('selectionchange', () => {
      const s = d.getSelection()
      if (s && s.rangeCount && (s.anchorNode?.parentElement?.closest('pd-e'))) range.current = s.getRangeAt(0).cloneRange()
    })
  }

  // bold, italic and links for words that allow formatting
  function format(cmd: 'bold' | 'italic' | 'createLink' | 'unlink') {
    const d = doc()
    const win = frame.current?.contentWindow
    if (!d || !win || !range.current) { toast('Click into the words on the page first.', 'bad'); return }
    const host = range.current.startContainer.parentElement?.closest('pd-e') as HTMLElement | null
    if (!host) return
    let arg: string | undefined
    if (cmd === 'createLink') {
      const url = window.prompt('Link address (for example /contact/ or https://...)')
      if (!url) return
      arg = url.trim()
    }
    win.focus()
    host.focus()
    const s = d.getSelection()
    s?.removeAllRanges()
    s?.addRange(range.current)
    d.execCommand('styleWithCSS', false, 'false')
    d.execCommand(cmd, false, arg)
    host.dispatchEvent(new Event('input', { bubbles: true }))
  }

  // ------------------------------------------------ save
  async function save() {
    if (!dirty || saving) return
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
  saveRef.current = save

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // ------------------------------------------------ sections tab
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const pinned = sections.filter((s) => s.pinned)
  const movable = sections.filter((s) => !s.pinned)

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = movable.findIndex((s) => s.key === active.id)
    const to = movable.findIndex((s) => s.key === over.id)
    setSections([...pinned, ...arrayMove(movable, from, to)])
    touch()
    bump()
  }
  const toggle = (k: string) => setOpen((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const hide = (k: string) => {
    setSections((all) => all.map((s) => (s.key === k ? { ...s, hidden: !s.hidden } : s)))
    touch()
    bump()
  }

  const renderBody = (s: Section) => {
    if (s.shared) {
      const b = blocks.find((x) => x.key === s.shared)
      if (!b) return <p className="help">This shared section is missing.</p>
      return (
        <>
          <Notice tone="info" icon={Icon.info()}><p>This section is the same on every page that shows it. Changes here update all of those pages.</p></Notice>
          <FieldsList prefix={`b-${b.key}`} fields={b.fields} onField={(fid, p) => { setBlockField(b.key, fid, p); scheduleRefresh() }} />
        </>
      )
    }
    return <FieldsList prefix={s.key} fields={s.fields || []} onField={(fid, p) => { setField(s.key, fid, p); scheduleRefresh() }} />
  }

  // ------------------------------------------------ panel pieces
  const altInput = (ref: string | null, id: string) => {
    if (!ref) return null
    const f = getField(ref)
    if (!f) return null
    return (
      <div className="field">
        <label htmlFor={id}>Photo description</label>
        <input id={id} className="input" value={textForEditing(f.value)} placeholder="What the photo shows"
          onChange={(e) => { setRef(ref, { value: textForSaving(e.target.value) }); const d = doc(); d?.querySelectorAll(`img[data-pda="${CSS_escape(ref)}"]`).forEach((im) => im.setAttribute('alt', e.target.value)) }} />
        <div className="help">{HELP.alt}</div>
      </div>
    )
  }

  const linkInput = (ref: string | null, id: string) => {
    if (!ref) return null
    const f = getField(ref)
    if (!f) return null
    return (
      <div className="field">
        <label htmlFor={id}>Link goes to</label>
        <input id={id} className="input" value={linkForEditing(f.value)}
          onChange={(e) => { setRef(ref, { value: linkForSaving(e.target.value) }); const d = doc(); d?.querySelectorAll(`a[data-pdh="${CSS_escape(ref)}"]`).forEach((a) => a.setAttribute('href', e.target.value)) }} />
        <div className="help">{HELP.link}</div>
      </div>
    )
  }

  const applyPhoto = (ref: string, d: MediaDoc) => {
    setRef(ref, { value: mediaSrc(d), media: d.id })
    const img = doc()?.querySelector(`img[data-pdi="${CSS_escape(ref)}"]`)
    const altRef = img?.getAttribute('data-pda')
    if (altRef && d.alt && !textForEditing(getField(altRef)?.value || '').trim()) setRef(altRef, { value: esc(d.alt) })
    bump()
    toast('Photo replaced. Press Save changes to keep it.', 'good')
  }

  const selectImage = (im: Img) => {
    markSelected(im.ref)
    setSelected({ kind: 'image', ref: im.ref, alt: im.alt, link: im.link, section: null })
    const el = doc()?.querySelector(`img[data-pdi="${CSS_escape(im.ref)}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const selectionCard = () => {
    if (!selected) return null
    if (selected.kind === 'note') {
      return (
        <div className="pe-card">
          <div className="pe-card-head"><b>{selected.title}</b><button className="btn small ghost" onClick={() => setSelected(null)} aria-label="Close">&times;</button></div>
          {selected.body}
        </div>
      )
    }
    if (selected.kind === 'text') {
      return (
        <div className="pe-card">
          <div className="pe-card-head"><b>Editing words</b>{selected.section ? <span className="chip grey">{selected.section}</span> : null}<button className="btn small ghost" onClick={() => setSelected(null)} aria-label="Close">&times;</button></div>
          {selected.ref.startsWith('b:') ? <p className="help">This part is the same on every page that shows it, so a change here updates all of them.</p> : null}
          {selected.rich ? (
            <div className="pe-format" role="toolbar" aria-label="Formatting">
              <button type="button" className="btn small" onMouseDown={(e) => e.preventDefault()} onClick={() => format('bold')}><b>B</b> Bold</button>
              <button type="button" className="btn small" onMouseDown={(e) => e.preventDefault()} onClick={() => format('italic')}><i>I</i> Italic</button>
              <button type="button" className="btn small" onMouseDown={(e) => e.preventDefault()} onClick={() => format('createLink')}>Link</button>
              <button type="button" className="btn small" onMouseDown={(e) => e.preventDefault()} onClick={() => format('unlink')}>Unlink</button>
            </div>
          ) : <p className="help">Type straight onto the page. Press Esc when you are done with this part.</p>}
          {linkInput(selected.link, 'pe-sel-link')}
        </div>
      )
    }
    const f = getField(selected.ref)
    return (
      <div className="pe-card">
        <div className="pe-card-head"><b>Photo</b>{selected.section ? <span className="chip grey">{selected.section}</span> : null}<button className="btn small ghost" onClick={() => { setSelected(null); markSelected(null) }} aria-label="Close">&times;</button></div>
        {f ? <ImageSlot label="Photo" value={f.value} original={(f as F & { original?: string }).original ?? f.value}
          onChange={(v) => { setRef(selected.ref, { value: v.value, media: v.media ?? undefined }); bump() }} /> : null}
        {altInput(selected.alt, 'pe-sel-alt')}
        {linkInput(selected.link, 'pe-sel-imglink')}
      </div>
    )
  }

  const status = saving ? 'Saving...' : dirty ? 'Unsaved changes' : saved ? 'All changes saved' : 'No changes yet'
  const width = device === 'desktop' ? DESKTOP_WIDTH : MOBILE_WIDTH
  const scale = stage.w ? Math.min(1, stage.w / width) : 1
  const frameHeight = stage.h ? Math.max(200, stage.h / scale) : 800

  return (
    <div className="pe">
      <div className="pe-bar">
        <a className="btn" href="/admin/pages">&larr; Pages</a>
        <h1 className="pe-title" title={props.url ? `precisiondentistry.com.au${props.url}` : undefined}>{props.label}</h1>
        <div className="pe-seg" role="group" aria-label="Preview size">
          <button type="button" className={device === 'desktop' ? 'on' : ''} aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>Desktop</button>
          <button type="button" className={device === 'mobile' ? 'on' : ''} aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>Mobile</button>
        </div>
        <span className={`pe-status${dirty ? ' warn' : ''}`} aria-live="polite">{status}</span>
        {props.url ? <a className="btn" href={props.url} target="_blank" rel="noopener">{Icon.external()} View</a> : null}
        <button className="btn primary" disabled={!dirty || saving} onClick={save}>{saving ? 'Saving...' : 'Save changes'}</button>
        <PublishButton />
      </div>

      <div className="pe-body">
        <div className={`pe-stage ${device}`} ref={stageRef}>
          <div className="pe-frame" style={{ width: width * scale }}>
            <iframe ref={frame} title={`Editing ${props.label}`} onLoad={onFrameLoad}
              style={{ width, height: frameHeight, transform: `scale(${scale})` }} />
          </div>
          {loading ? <div className="pe-loading" role="status">Updating the preview...</div> : null}
          {previewError ? <div className="pe-error"><Notice tone="bad" icon={Icon.warn()}><p>{previewError}</p><button className="btn small" onClick={() => refresh()}>Try again</button></Notice></div> : null}
        </div>

        <aside className="pe-panel" aria-label="Page settings">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'content'} className={tab === 'content' ? 'on' : ''} onClick={() => setTab('content')}>Content</button>
            <button role="tab" aria-selected={tab === 'seo'} className={tab === 'seo' ? 'on' : ''} onClick={() => setTab('seo')}>SEO</button>
            <button role="tab" aria-selected={tab === 'sections'} className={tab === 'sections' ? 'on' : ''} onClick={() => setTab('sections')}>Sections</button>
          </div>
          <div className="pe-scroll">
            {tab === 'content' ? (
              <>
                <div className="pe-tip">
                  <p><b>Click any words on the page</b> to change them in place.</p>
                  <p><b>Click any photo</b> to replace it.</p>
                  <p>Press <b>Save changes</b> when you are done, then <b>Publish website</b> to put it live.</p>
                </div>
                {selectionCard()}
                <h3 className="pe-h">Photos on this page ({images.length})</h3>
                {!images.length && !loading ? <p className="help">This page has no photos that can be changed here.</p> : null}
                <div className="pe-imgs">
                  {images.map((im, i) => {
                    const f = getField(im.ref)
                    const alt = im.alt ? getField(im.alt) : null
                    const src = (f?.value || '').replace(/&amp;/g, '&')
                    return (
                      <div key={im.ref} className={`pe-img${selected?.kind === 'image' && selected.ref === im.ref ? ' on' : ''}`}>
                        <button type="button" className="pe-thumb" onClick={() => selectImage(im)} aria-label={`Show photo ${i + 1} on the page`}>
                          {src ? <img src={src} alt="" loading="lazy" /> : null}
                        </button>
                        {alt ? (
                          <input className="input" aria-label={`Description of photo ${i + 1}`} value={textForEditing(alt.value)} placeholder="Describe the photo"
                            onChange={(e) => { setRef(im.alt!, { value: textForSaving(e.target.value) }); doc()?.querySelectorAll(`img[data-pda="${CSS_escape(im.alt!)}"]`).forEach((x) => x.setAttribute('alt', e.target.value)) }} />
                        ) : <span className="help grow">No description needed</span>}
                        <button type="button" className="btn small" onClick={() => setPickFor(im.ref)}>Replace</button>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : null}
            {tab === 'seo' ? (
              <SeoPanel seo={seo} onChange={(s) => { setSeo(s); touch() }} url={props.url || '/'} defaultOg={props.defaultOg} titleHint={props.defaultTitle} />
            ) : null}
            {tab === 'sections' ? (
              <>
                <p className="help" style={{ marginBottom: 12 }}>Drag the dots to change the order. The eye hides or shows a section. Click a section to jump to it, and open it to edit everything in it as a form, including parts that are hidden on the page.</p>
                <div className="sections">
                  {pinned.map((s) => (
                    <SectionRow key={s.key} s={s} open={open.has(s.key)} onToggle={() => toggle(s.key)} onShow={() => scrollToSection(s)} sortable={false}>{renderBody(s)}</SectionRow>
                  ))}
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={movable.map((s) => s.key)} strategy={verticalListSortingStrategy}>
                      {movable.map((s) => (
                        <SectionRow key={s.key} s={s} sortable open={open.has(s.key)} onToggle={() => toggle(s.key)} onShow={() => scrollToSection(s)} onHide={() => hide(s.key)}>{renderBody(s)}</SectionRow>
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </>
            ) : null}
            {props.lastmod ? <p className="help" style={{ marginTop: 14 }}>Last changed {props.lastmod}.</p> : null}
          </div>
        </aside>
      </div>
      {pickFor ? <MediaPicker onClose={() => setPickFor(null)} onPick={(d) => { const r = pickFor; setPickFor(null); applyPhoto(r, d) }} /> : null}
    </div>
  )
}

/** CSS.escape for attribute selectors, kept local so it works in every browser the dashboard supports. */
function CSS_escape(s: string): string {
  return s.replace(/["\\]/g, '\\$&')
}
