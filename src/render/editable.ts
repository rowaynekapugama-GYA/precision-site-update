/**
 * The page as the visual editor shows it (Coastal Dental style, 29 October 2026).
 *
 * The page is rendered exactly as it goes live, with every editable spot marked:
 * - words become <pd-e data-pde="s:<section>|f3" data-t="text|rich">...</pd-e>, clicked to edit in place;
 *   practice details inside them ({{site:phone}}) are locked chips that fill in from Site Settings;
 * - photos get data-pdi (the photo field) and data-pda (its description field);
 * - links get data-pdh (the address field);
 * - the first element of each section gets data-pds, so the Sections tab can scroll to it.
 * Words inside an <option>, <script>, <style>, <title>, <textarea> or an SVG drawing are not marked:
 * they are edited in the Sections tab form instead.
 */
import type { Block, Field, Page } from './types'
import { fieldValue, renderPage, type RenderCtx } from './page'
import { externalLinks } from './site'
import { BA_DISCLAIMER } from './leads'

const RAW = new Set(['script', 'style', 'title', 'textarea', 'option'])
const PH = /\{\{(f\d+)\}\}/g

function chips(v: string): string {
  return v.replace(/\{\{site:([a-zA-Z]+)\}\}/g, '<span class="pd-tok" contenteditable="false" data-pdt="$1">{{site:$1}}</span>')
}

/** Fill a section's {{fN}} placeholders with its values, marking each editable spot. */
export function markTemplate(template: string, scope: string, fields: Field[], ctx: RenderCtx, sectionMark: string | null): string {
  const byId = new Map(fields.map((f) => [f.id, f]))
  const value = (id: string) => { const f = byId.get(id); return f ? fieldValue(f, ctx) : '' }
  const ref = (id: string) => `${scope}|${id}`
  let first = sectionMark !== null
  let svg = 0
  let out = ''
  let i = 0
  const n = template.length

  const text = (s: string) => s.replace(PH, (_m, id: string) => {
    const f = byId.get(id)
    if (!f) return ''
    const v = value(id)
    if (svg > 0 || (f.type !== 'text' && f.type !== 'rich')) return v
    return `<pd-e data-pde="${ref(id)}" data-t="${f.type}">${chips(v)}</pd-e>`
  })

  const tag = (t: string, name: string, closing: boolean) => {
    if (closing) return t
    const marks: string[] = []
    if (first) { marks.push(`data-pds="${sectionMark}"`); first = false }
    const filled = t.replace(/([\w:-]+)=("([^"]*)"|'([^']*)')/g, (whole, attrName: string) => {
      if (!whole.includes('{{f')) return whole
      const a = attrName.toLowerCase()
      const ids = [...whole.matchAll(PH)].map((m) => m[1])
      const id = ids[0]
      const f = byId.get(id)
      if (f && svg === 0) {
        if (name === 'img' && a === 'src' && f.type === 'image') marks.push(`data-pdi="${ref(id)}"`)
        else if (name === 'img' && a === 'alt') marks.push(`data-pda="${ref(id)}"`)
        else if (name === 'a' && a === 'href') marks.push(`data-pdh="${ref(id)}"`)
      }
      return whole.replace(PH, (_m, fid: string) => value(fid))
    })
    if (!marks.length) return filled
    return filled.replace(/^<([a-zA-Z][\w:-]*)/, `<$1 ${marks.join(' ')}`)
  }

  while (i < n) {
    const lt = template.indexOf('<', i)
    out += text(template.slice(i, lt < 0 ? n : lt))
    if (lt < 0) break
    if (template.startsWith('<!--', lt)) {
      const end = template.indexOf('-->', lt)
      const stop = end < 0 ? n : end + 3
      out += template.slice(lt, stop).replace(PH, (_m, id: string) => value(id))
      i = stop
      continue
    }
    const m = /^<(\/?)([a-zA-Z][\w:-]*)/.exec(template.slice(lt, lt + 64))
    if (!m) { out += '<'; i = lt + 1; continue }
    let j = lt + m[0].length
    let q: string | null = null
    while (j < n) {
      const c = template[j]
      if (q) { if (c === q) q = null } else if (c === '"' || c === "'") q = c
      else if (c === '>') break
      j++
    }
    const t = template.slice(lt, j + 1)
    const name = m[2].toLowerCase()
    const closing = m[1] === '/'
    out += tag(t, name, closing)
    i = j + 1
    if (closing) {
      if (name === 'svg' && svg > 0) svg--
      continue
    }
    if (name === 'svg' && !t.endsWith('/>')) svg++
    if (RAW.has(name)) {
      const close = template.toLowerCase().indexOf(`</${name}`, i)
      const stop = close < 0 ? n : close
      out += template.slice(i, stop).replace(PH, (_m, id: string) => value(id))
      i = stop
    }
  }
  return out
}

const TRACKING = /<script>\(function\(w,d,s,l,i\)[\s\S]*?<\/script>|<script async src="https:\/\/www\.googletagmanager\.com[\s\S]*?<\/script>\n<script>window\.dataLayer[\s\S]*?<\/script>|<script>!function\(f,b,e,v,n,t,s\)[\s\S]*?<\/script>|<noscript><iframe src="https:\/\/www\.googletagmanager\.com[\s\S]*?<\/noscript>|<noscript><img height="1" width="1"[\s\S]*?<\/noscript>/g

const EDIT_CSS = `<style id="pd-edit-css">
pd-e{outline:1px dashed transparent;outline-offset:3px;border-radius:2px;cursor:text;transition:outline-color .15s,background-color .15s}
pd-e:hover{outline-color:rgba(10,132,184,.75)}
pd-e:focus{outline:2px solid #0A84B8;background-color:rgba(10,132,184,.07)}
pd-e:empty{display:inline-block;min-width:4ch}
pd-e:empty::before{content:'Add words';opacity:.45;font-style:italic}
.pd-tok{background:rgba(10,132,184,.14);border-radius:3px;padding:0 2px;cursor:default}
img[data-pdi]{cursor:pointer}
img[data-pdi]:hover{outline:3px solid rgba(10,132,184,.8);outline-offset:-3px}
img.pd-sel,img.pd-sel:hover{outline:3px solid #0A84B8;outline-offset:-3px}
.pd-flash{animation:pdflash 1.4s ease}
@keyframes pdflash{0%,40%{box-shadow:inset 0 0 0 4px #0A84B8}100%{box-shadow:inset 0 0 0 4px rgba(10,132,184,0)}}
.reveal,.reveal-left,.reveal-right,.hero-up{opacity:1!important;transform:none!important}
.faq-a{grid-template-rows:1fr!important}
#offerPop,.skip-link{display:none!important}
</style>`

const EDIT_BOOT = `<script>try{sessionStorage.setItem('pd_offer_seen','1')}catch(e){}</script>`

/** The page with its unsaved sections and shared blocks, marked for the visual editor. */
export function renderEditable(page: Page, ctx: RenderCtx): string {
  const blocks: Record<string, Block> = {}
  for (const s of page.sections) {
    if (!s.shared || blocks[s.shared]) continue
    const b = ctx.content.blocks[s.shared]
    if (!b) continue
    blocks[s.shared] = { ...b, template: markTemplate(b.template, `b:${s.shared}`, b.fields, ctx, `b:${s.shared}`), fields: [] }
  }
  const sections = page.sections.map((s) => {
    if (s.shared) return s
    let fields = s.fields ?? []
    if (s.generated === 'beforeAfter') fields = fields.map((f) => (f.id === 'f4' && !String(f.value).trim() ? { ...f, value: BA_DISCLAIMER } : f))
    return { ...s, template: markTemplate(s.template ?? '', `s:${s.key}`, fields, ctx, s.key), fields: [] }
  })
  const ctx2: RenderCtx = { ...ctx, content: { ...ctx.content, blocks: { ...ctx.content.blocks, ...blocks } } }
  let html = externalLinks(renderPage({ ...page, sections }, ctx2))
  html = html.replace(TRACKING, '')
  html = html.replace('</head>', `${EDIT_CSS}\n</head>`)
  html = html.replace(/<body([^>]*)>/, `<body$1>\n${EDIT_BOOT}`)
  return html
}
