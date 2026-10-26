/**
 * Pages back to HTML.
 *
 * render(page) = head + pre + main + post, where head, pre and post are either the
 * shared templates in content/chrome.json or the page's own (Home and the 404 page
 * keep their hand-built versions). Placeholders are filled in three passes:
 * fields ({{f3}}), generated blocks ({{gen:team}}), then practice details
 * ({{site:phone}}), SEO ({{seo:title}}) and finally the JSON-LD ({{schema}}).
 */
import type { Content, Field, Page, Section } from './types'
import { siteTokens, practiceNode } from './settings'
import { attr, deepEqual, esc, ORIGIN, plain, pyJson, unescapeHtml } from './util'
import { articleIndex, sitemapArticles, teamGrid, itemListNode } from './posts'
import { BA_DISCLAIMER, beforeAfterCards, casesFor, registrationTokens, withLeadDefaults } from './leads'
import { videoNodes } from './media'

export interface RenderCtx {
  content: Content
  tokens: Record<string, string>
  replacements: Map<string, string>
  /** the page being rendered, for blocks that depend on it (before and after cases) */
  pageKey?: string
}

export function makeCtx(content: Content): RenderCtx {
  const replacements = new Map<string, string>()
  for (const r of content.settings.imageReplacements || []) {
    if (r.from && r.to) replacements.set(r.from, r.to)
  }
  const settings = withLeadDefaults(content.settings)
  return {
    content: { ...content, settings, beforeAfter: content.beforeAfter || [] },
    tokens: { ...siteTokens(settings), ...registrationTokens(content.team || []) },
    replacements,
  }
}

export function fieldValue(f: Field, ctx: RenderCtx): string {
  if (f.type === 'image') {
    const r = ctx.replacements.get(f.value)
    return r ? attr(r) : f.value
  }
  return f.value
}

/** Fill {{fN}} from the field list in one pass, so values are never re-scanned. */
export function fill(template: string, fields: Field[], ctx: RenderCtx): string {
  const byId = new Map(fields.map((f) => [f.id, f]))
  return template.replace(/\{\{(f\d+)\}\}/g, (m, id: string) => {
    const f = byId.get(id)
    return f ? fieldValue(f, ctx) : ''
  })
}

function genBlock(name: string, ctx: RenderCtx): string {
  if (name === 'team') return teamGrid(ctx.content.team)
  if (name === 'beforeAfter') return beforeAfterCards(casesFor(ctx.content.beforeAfter, ctx.pageKey || ''))
  if (name === 'beforeAfterCount') {
    const n = casesFor(ctx.content.beforeAfter, ctx.pageKey || '').length
    return `${n} ${n === 1 ? 'case' : 'cases'}`
  }
  if (name === 'articleIndex') return articleIndex(ctx.content.posts)
  if (name === 'sitemapArticles') return sitemapArticles(ctx.content.posts)
  return ''
}

export function renderSection(sec: Section, ctx: RenderCtx, alt: boolean | null): string {
  if (sec.shared) {
    const b = ctx.content.blocks[sec.shared]
    if (!b) return ''
    return fill(b.template, b.fields, ctx)
  }
  // the before and after gallery stays out of the page until it has a case ready to show
  if (sec.generated === 'beforeAfter') {
    if (!casesFor(ctx.content.beforeAfter, ctx.pageKey || '').length) return ''
    const fields = (sec.fields ?? []).map((f) => (f.id === 'f4' && !String(f.value).trim() ? { ...f, value: BA_DISCLAIMER } : f))
    return fill(sec.template ?? '', fields, ctx).replace(/\{\{gen:([a-zA-Z]+)\}\}/g, (_m, n: string) => genBlock(n, ctx))
  }
  let t = sec.template ?? ''
  if (sec.altAuto) t = t.replace('{{alt}}', (alt ?? sec.alt) ? ' section-alt' : '')
  t = fill(t, sec.fields ?? [], ctx)
  return t.replace(/\{\{gen:([a-zA-Z]+)\}\}/g, (_m, n: string) => genBlock(n, ctx))
}

/** Backgrounds alternate by position. Untouched pages keep exactly what they had;
 * once sections are reordered or hidden the alternation is worked out again. */
function altPlan(page: Page): Map<string, boolean> | null {
  const visible = page.sections.filter((s) => !s.hidden)
  // only the alternating sections matter: adding, hiding or moving a section with its own
  // background (FAQ, Book Your Visit band, before and after) leaves the others as they were
  const alts = page.sections.filter((s) => s.altAuto)
  const nums = alts.map((s) => parseInt(s.key.replace(/\D/g, ''), 10))
  const untouched = alts.every((s) => !s.hidden) && nums.every((n, i) => i === 0 || n > nums[i - 1])
  if (untouched) return null
  const plan = new Map<string, boolean>()
  let i = 0
  for (const s of visible) {
    if (s.altAuto) {
      plan.set(s.key, i % 2 === 1)
      i++
    }
  }
  return plan
}

export function renderMain(page: Page, ctx: RenderCtx): string {
  ctx.pageKey = page.key
  const plan = altPlan(page)
  let out = ''
  for (const s of page.sections) {
    if (s.hidden) continue
    const html = renderSection(s, ctx, plan ? plan.get(s.key) ?? null : null)
    // a section that is switched off (an empty gallery, the offer when there is no offer)
    // leaves no trace, not even the blank line or comment in front of it
    const only = /^\{\{site:([a-zA-Z]+)\}\}$/.exec(html)
    if (html === '' || (only && ctx.tokens[only[1]] === '')) continue
    out += s.before + html
  }
  return out + page.tail
}

// ---------------------------------------------------------------- schema
export function breadcrumbNode(mainHtml: string): Record<string, unknown> | null {
  const m = /<nav class="breadcrumbs"[^>]*>(.*?)<\/nav>/s.exec(mainHtml)
  if (!m) return null
  const items = [...m[1].matchAll(/<li>(?:<a href="([^"]*)">(.*?)<\/a>|<span aria-current="page">(.*?)<\/span>)/gs)]
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: plain(it[2] ?? it[3] ?? ''),
      ...(it[1] ? { item: ORIGIN + plain(it[1]) } : {}),
    })),
  }
}

export function faqNode(mainHtml: string): Record<string, unknown> | null {
  const items = [...mainHtml.matchAll(/<span class="q">(.*?)<\/span>.*?<div class="faq-a"[^>]*><div>(.*?)<\/div><\/div>/gs)]
  if (!items.length) return null
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((it) => {
      const parts = [...it[2].matchAll(/<(p|li)[^>]*>(.*?)<\/\1>/gs)]
      const text = parts.length ? parts.map((p) => plain(p[2]).trim()).join(' ') : plain(it[2])
      return { '@type': 'Question', name: plain(it[1]), acceptedAnswer: { '@type': 'Answer', text } }
    }),
  }
}

export function graphJson(nodes: Record<string, unknown>[]): string {
  return pyJson({ '@context': 'https://schema.org', '@graph': nodes })
}

function pageSchema(page: Page, mainHtml: string, ctx: RenderCtx): string {
  const nodes: Record<string, unknown>[] = [practiceNode(ctx.content.settings)]
  if (page.sections.some((s) => s.generated === 'articleIndex' && !s.hidden)) {
    nodes.push(itemListNode(ctx.content.posts))
  }
  const bc = breadcrumbNode(mainHtml)
  if (bc) nodes.push(bc)
  const faq = faqNode(mainHtml)
  if (faq) nodes.push(faq)
  nodes.push(...videoNodes(mainHtml))
  if (page.layout.schemaLiteral) {
    // the homepage's hand-formatted JSON-LD is kept while it still says the same thing
    try {
      const lit = JSON.parse(page.layout.schemaLiteral)
      if (deepEqual(lit, { '@context': 'https://schema.org', '@graph': nodes })) return page.layout.schemaLiteral
    } catch { /* fall through */ }
  }
  return graphJson(nodes)
}

// ---------------------------------------------------------------- tokens
export function abs(p: string): string {
  if (!p) return ''
  return /^https?:\/\//i.test(p) ? p : ORIGIN + (p.startsWith('/') ? p : '/' + p)
}

export interface SeoValues {
  title: string
  description: string
  canonical: string
  url: string
  ogImage: string
  noindex: boolean
}

export function fillTokens(html: string, ctx: RenderCtx, seo: SeoValues | null): string {
  return html.replace(/\{\{(site|seo):([a-zA-Z]+)\}\}/g, (m, ns: string, k: string) => {
    // a registration line for someone no longer on the Team screen simply disappears
    if (ns === 'site') return ctx.tokens[k] ?? (k.startsWith('reg') ? '' : m)
    if (!seo) return m
    switch (k) {
      case 'title': return esc(seo.title)
      case 'description': return esc(seo.description)
      case 'canonical': return esc(seo.canonical)
      case 'url': return esc(seo.url)
      case 'ogImage': return esc(seo.ogImage)
      case 'robots': return seo.noindex ? '\n<meta name="robots" content="noindex">' : ''
      default: return m
    }
  })
}

/** Swap a built-in photo for its replacement everywhere it appears, menu included. */
export function applyReplacements(html: string, ctx: RenderCtx): string {
  for (const [from, to] of ctx.replacements) {
    html = html.split(`src="${from}"`).join(`src="${attr(to)}"`)
    html = html.split(`content="${ORIGIN}${from}"`).join(`content="${esc(abs(to))}"`)
  }
  return html
}

/** Remove the Emergency column from the menus when that service is switched off. */
export function applyFeatures(html: string, ctx: RenderCtx): string {
  const f = ctx.content.settings.features
  if (f.emergencyDentistry) return html
  return html
    .replace(/\n\s*<div class="mega-col">\s*<h4><a href="\/service\/dental-emergency\/">.*?<\/div>(?=\n\s*<\/div>|\n\s*<div class="mega-col">)/s, '')
    .replace(/<details class="mm-group">\s*<summary>Emergency<\/summary>.*?<\/details>/s, '')
}

/** Practice details inside plain text (SEO fields, schema), unescaped. */
export function resolvePlain(s: string, ctx: RenderCtx): string {
  return String(s ?? '').replace(/\{\{site:([a-zA-Z]+)\}\}/g, (m, k: string) =>
    ctx.tokens[k] !== undefined ? unescapeHtml(ctx.tokens[k]) : m)
}

export function seoFor(page: Page, ctx: RenderCtx): SeoValues {
  const d = ctx.content.settings.seoDefaults
  const url = ORIGIN + (page.url ?? '/')
  return {
    title: resolvePlain(page.seo.title, ctx),
    description: resolvePlain(page.seo.description || d.description, ctx),
    canonical: page.seo.canonical || url,
    url,
    ogImage: abs(ctx.replacements.get(page.seo.ogImage || d.ogImage) ?? (page.seo.ogImage || d.ogImage)),
    noindex: !!page.seo.noindex,
  }
}

export function renderPage(page: Page, ctx: RenderCtx): string {
  const ch = ctx.content.chrome
  const head = page.layout.head === 'std' ? ch.head : page.layout.head
  const pre = page.layout.pre === 'std' ? ch.pre : page.layout.pre
  const post = page.layout.post === 'std' ? ch.post : page.layout.post
  const main = renderMain(page, ctx)
  let html = head + pre + main + post
  html = fillTokens(html, ctx, seoFor(page, ctx))
  html = applyReplacements(html, ctx)
  html = applyFeatures(html, ctx)
  if (page.layout.schema !== 'none') {
    const resolvedMain = fillTokens(main, ctx, null)
    html = html.replace('{{schema}}', () => pageSchema(page, resolvedMain, ctx))
  }
  return html
}
