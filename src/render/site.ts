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
  // the price list PDF is handed out through the form, never found through a search engine
  return `User-agent: *\nAllow: /\nDisallow: /downloads/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`
}

/** Every public file the site needs, keyed by path relative to the web root. */
export function renderSite(content: Content): Map<string, string> {
  const ctx = makeCtx(content)
  const out = new Map<string, string>()
  for (const pg of content.pages) out.set(pg.file, externalLinks(renderPage(pg, ctx)))
  for (const p of content.posts) {
    if (!isLive(p)) continue
    out.set(`${p.slug}.html`, externalLinks(renderPost(p, ctx)))
  }
  out.set('sitemap.xml', sitemapXml(content))
  out.set('robots.txt', robotsTxt())
  return out
}

const OWN_HOST = /^https?:\/\/(www\.)?precisiondentistry\.com\.au(\/|$)/i

/**
 * Links to other websites open in a new tab with rel="noopener noreferrer" (pre-launch audit,
 * 27 October 2026). Applied to the finished HTML, so page content, posts and the header and
 * footer are covered whether they come from the dashboard or the repo.
 */
export function externalLinks(html: string): string {
  // accessibility (pre-launch audit, 27 October 2026): a skip link to the main content, the footer column
  // headings read as level 2 (they follow the page's h2s), and the phone bar at the bottom is a labelled region
  if (!html.includes('class="skip-link"')) html = html.replace(/<body([^>]*)>/, '<body$1>\n<a class="skip-link" href="#main">Skip to main content</a>')
  html = html.replace(/<main>/, '<main id="main">')
  // where a page goes straight from its h1 to h3s (the blog list, the sitemap), those h3s read as level 2
  const h1 = html.indexOf('<h1')
  if (h1 > 0) {
    const firstH2 = html.indexOf('<h2', h1)
    const end = firstH2 > 0 ? firstH2 : html.indexOf('<footer')
    if (end > h1) {
      const mid = html.slice(h1, end)
      if (/<h3>/.test(mid)) html = html.slice(0, h1) + mid.replace(/<h3>/g, '<h3 role="heading" aria-level="2">') + html.slice(end)
    }
  }
  const foot = html.indexOf('<footer')
  if (foot > 0) html = html.slice(0, foot) + html.slice(foot).replace(/<h4>/g, '<h4 role="heading" aria-level="2">')
  // the copyright year is in the page itself, not only added by the script
  html = html.replace('<span id="year"></span>', `<span id="year">${new Date().getFullYear()}</span>`)
  html = html.replace('<div class="sticky-bar">', '<div class="sticky-bar" role="region" aria-label="Call or book online">')
  // an iframe whose allow list already grants fullscreen does not also need allowfullscreen (browsers warn about it)
  // a social icon with no profile address set in Site Settings is left out rather than linking to "#"
  html = html.replace(/\s*<a href="#" aria-label="(Facebook|Instagram|YouTube|LinkedIn|Google Business Profile)">[\s\S]*?<\/a>/g, '')
  // "Learn more" buttons say what they are about to screen readers and search engines (the words on screen are unchanged)
  html = html.replace(/(<h3>((?:(?!<\/h3>)[\s\S]){3,160})<\/h3>(?:(?!<h3>)[\s\S]){0,2500}?<a class="btn btn-white" href="[^"]*">)Learn more( <span class="arr">)/g,
    (_m, before: string, heading: string, after: string) => {
      const words = heading.replace(/<sup>[\s\S]*?<\/sup>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      return `${before}Learn more<span class="sr-only"> about ${words}</span>${after}`
    })
  // the virtual tour's "web-share" permission is not recognised by current browsers and logs a warning
  html = html.replace(/(<iframe\b[^>]*\sallow="[^"]*?)\s*web-share;?/g, '$1')
  html = html.replace(/<iframe\b[^>]*>/g, (tag) => /\sallow="[^"]*fullscreen/.test(tag) ? tag.replace(/\sallowfullscreen(="[^"]*")?/, '') : tag)
  return html.replace(/<a\b[^>]*>/g, (tag) => {
    const href = /\shref="([^"]*)"/.exec(tag)?.[1] ?? ''
    if (!/^https?:\/\//i.test(href) || OWN_HOST.test(href)) return tag
    let t = tag
    if (!/\starget=/.test(t)) t = t.replace(/^<a\b/, '<a target="_blank"')
    const rel = /\srel="([^"]*)"/.exec(t)
    const want = new Set([...(rel ? rel[1].split(/\s+/).filter(Boolean) : []), 'noopener', 'noreferrer'])
    const value = [...want].join(' ')
    t = rel ? t.replace(rel[0], ` rel="${value}"`) : t.replace(/^<a\b/, `<a rel="${value}"`)
    return t
  })
}

/** Every public address, for the middleware's 404 decision. */
export function siteRoutes(content: Content): string[] {
  const urls = new Set<string>()
  for (const pg of content.pages) if (pg.url) urls.add(pg.url)
  for (const p of content.posts) if (isLive(p)) urls.add(postUrl(p))
  return [...urls].sort()
}
