/** The whole public site, as a map of file path to contents. */
import type { Content, Post } from './types'
import { abs, applyFeatures, applyReplacements, fill, fillTokens, graphJson, makeCtx, renderPage, resolvePlain, type RenderCtx } from './page'
import { practiceNode } from './settings'
import { articleMain, articleNodes, isLive, postImage, postUrl } from './posts'
import { ORIGIN } from './util'


export function renderPost(p: Post, ctx: RenderCtx): string {
  const ch = ctx.content.chrome
  const cta = ctx.content.blocks.cta
  const ctaHtml = cta ? fill(cta.template, cta.fields, ctx) : ''
  const main = articleMain(p, ctx.content.posts, ctaHtml)
  const url = ORIGIN + postUrl(p)
  const img = ctx.replacements.get(p.seo.ogImage || postImage(p)) ?? (p.seo.ogImage || postImage(p))
  let html = ch.head + ch.pre + main + ch.post
  html = fillTokens(html, ctx, {
    title: resolvePlain(p.seo.title || `${p.title} | Precision Dental`, ctx),
    description: resolvePlain(p.seo.description, ctx),
    canonical: p.seo.canonical || url,
    url,
    ogImage: abs(img),
    noindex: !!p.seo.noindex || !isLive(p),
  })
  html = applyReplacements(html, ctx)
  html = applyFeatures(html, ctx)
  const nodes = [practiceNode(ctx.content.settings), ...articleNodes(p, (s) => resolvePlain(s, ctx))]
  return html.replace('{{schema}}', () => graphJson(nodes))
}

export function sitemapXml(content: Content): string {
  const rows: [string, string][] = []
  for (const pg of content.pages) {
    if (!pg.url || pg.seo.noindex) continue
    rows.push([pg.url, pg.lastmod || ''])
  }
  for (const p of content.posts) {
    if (!isLive(p) || p.seo.noindex) continue
    rows.push([postUrl(p), p.lastmod || p.published || ''])
  }
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  const postUrls = new Set(content.posts.map(postUrl))
  const lines = rows.map(([u, lm]) => {
    const prio = postUrls.has(u) ? '0.6' : u === '/' ? '1.0' : u === '/blog/' ? '0.8' : '0.7'
    return `  <url><loc>${ORIGIN}${u}</loc><lastmod>${lm}</lastmod><priority>${prio}</priority></url>`
  })
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    lines.join('\n') + '\n</urlset>\n'
}

export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`
}

/** Every public file the site needs, keyed by path relative to the web root. */
export function renderSite(content: Content): Map<string, string> {
  const ctx = makeCtx(content)
  const out = new Map<string, string>()
  for (const pg of content.pages) out.set(pg.file, renderPage(pg, ctx))
  for (const p of content.posts) {
    if (!isLive(p)) continue
    out.set(`${p.slug}.html`, renderPost(p, ctx))
  }
  out.set('sitemap.xml', sitemapXml(content))
  out.set('robots.txt', robotsTxt())
  return out
}

/** Every public address, for the middleware's 404 decision. */
export function siteRoutes(content: Content): string[] {
  const urls = new Set<string>()
  for (const pg of content.pages) if (pg.url) urls.add(pg.url)
  for (const p of content.posts) if (isLive(p)) urls.add(postUrl(p))
  return [...urls].sort()
}
