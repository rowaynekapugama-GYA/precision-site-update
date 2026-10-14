/**
 * Blog posts, the Dental Articles index, the HTML sitemap's article column and the
 * Meet the Team grid. A straight port of the generator that built the approved
 * site, so the 69 existing articles come back byte for byte, and a post written in
 * the dashboard gets exactly the same page, schema and index card.
 */
import type { Post, TeamMember } from './types'
import { auDate, esc, ORIGIN, plain } from './util'

export const INDEX_PATH = '/blog/'
export const INDEX_LABEL = 'Dental Articles'
export const PRACTICE = 'Precision Dental'

export const DISCLAIMER = 'The information in this article is general in nature and is not a substitute ' +
  'for personalised advice from a registered dental practitioner. Individual ' +
  'needs, experiences and results vary.'
export const RISK = 'Any surgical or invasive procedure carries risks. Before proceeding, you should ' +
  'seek a second opinion from an appropriately qualified health practitioner.'

const ICON_ARROW = '<svg class="go" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M5 12h14M13 6l6 6-6 6"/></svg>'
const ICON_SPARK = '<svg viewBox="0 0 24 24" fill="currentColor">' +
  '<path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/></svg>'
const ICON_CHEV_RIGHT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>'
const ICON_CHEV_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'

/** The marker a post body carries where the Book Online and Call buttons go. */
export const CTA_MARKER = '<div class="article-cta-marker"></div>'

export function ctaButtons(): string {
  const book = '<a class="btn btn-dark" href="{{site:booking}}" target="_blank" rel="noopener" ' +
    'data-track="book">Book Online <span class="arr">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/>' +
    '</svg></span></a>'
  const call = '<a class="btn btn-white btn-plain" href="tel:{{site:phoneTel}}" data-track="call">' +
    'Call {{site:phone}}</a>'
  return `<div class="btn-group article-cta">${book}${call}</div>`
}

export function pill(text: string): string {
  return `<span class="pill">${ICON_SPARK}${esc(text)}</span>`
}

export function primaryCategory(cats: string[]): string {
  const list = cats && cats.length ? cats : [INDEX_LABEL]
  return list.find((c) => c !== 'Dental Articles') ?? list[0]
}

export function postUrl(p: Pick<Post, 'slug'>): string {
  return `/${p.slug}/`
}

export function postImage(p: Post): string {
  return p.image || '/assets/img/og-image.jpg'
}

export function isLive(p: Post): boolean {
  return p.status === 'published'
}

export function breadcrumbs(trail: [string, string | null][]): string {
  const items = trail.map(([label, href], i) => {
    const last = i === trail.length - 1
    const inner = last ? `<span aria-current="page">${esc(label)}</span>` : `<a href="${esc(href)}">${esc(label)}</a>`
    return `<li>${inner}${last ? '' : ICON_CHEV_RIGHT}</li>`
  })
  return '<nav class="breadcrumbs" aria-label="Breadcrumb"><div class="container"><ol>' + items.join('') + '</ol></div></nav>'
}

export function faqBlock(items: { q: string; a: string[] }[]): string {
  if (!items.length) return ''
  const out = items.map((it, idx) => {
    const i = idx + 1
    const op = i === 1 ? ' open' : ''
    const exp = op ? 'true' : 'false'
    const ans = it.a.map((a) => `<p>${esc(a)}</p>`).join('')
    return `<div class="faq-item${op}"><h3 class="faq-h"><button class="faq-q" ` +
      `aria-expanded="${exp}" aria-controls="faq${i}"><span class="num">${i}</span>` +
      `<span class="q">${esc(it.q)}</span><span class="chev">${ICON_CHEV_DOWN}</span>` +
      `</button></h3><div class="faq-a" id="faq${i}"><div>${ans}</div></div></div>`
  })
  return '<section class="body-section faq"><div class="container">' +
    `<div class="section-head center">${pill('Questions')}` +
    '<h2>Frequently Asked Questions</h2></div>' +
    `<div class="faq-list">${out.join('')}</div></div></section>`
}

export function disclaimerBlock(showRisk: boolean): string {
  const bits = [`<p class="disclaimer">${esc(DISCLAIMER)}</p>`]
  if (showRisk) bits.push(`<p class="disclaimer">${esc(RISK)}</p>`)
  return '<section class="disclaimer-section"><div class="container">' + bits.join('') + '</div></section>'
}

export function relatedBlock(cards: Post[]): string {
  if (!cards.length) return ''
  const out = cards.map((c) =>
    `<a class="art-rel-card" href="${esc(postUrl(c))}">` +
    `<span class="ar-img"><img src="${esc(postImage(c))}" alt="" loading="lazy" ` +
    'width="1200" height="630"></span>' +
    `<span class="ar-tx"><small>${esc(primaryCategory(c.categories))}</small>` +
    `<strong>${esc(c.title)}</strong></span></a>`).join('')
  return '<section class="body-section section-alt"><div class="container">' +
    `<div class="section-head">${pill('Keep Reading')}` +
    '<h2>Related articles</h2></div>' +
    `<div class="art-rel-grid">${out}</div></div></section>`
}

/** Three related posts: the ones chosen, then the newest in the same category. */
export function relatedFor(p: Post, all: Post[]): Post[] {
  const live = all.filter((x) => isLive(x) && x.slug !== p.slug)
  const bySlug = new Map(live.map((x) => [x.slug, x]))
  const picks: Post[] = []
  for (const s of p.related || []) {
    const r = bySlug.get(s)
    if (r && !picks.includes(r)) picks.push(r)
  }
  if (picks.length < 3) {
    const prim = primaryCategory(p.categories)
    const newest = [...live].sort((a, b) => (b.published || '').localeCompare(a.published || ''))
    for (const r of newest.filter((x) => primaryCategory(x.categories) === prim).concat(newest)) {
      if (picks.length >= 3) break
      if (!picks.includes(r)) picks.push(r)
    }
  }
  return picks.slice(0, 3)
}

/** The opening sentence or two, for an index card when no summary was written. */
export function autoExcerpt(bodyHtml: string, limit = 165): string {
  for (const m of bodyHtml.matchAll(/<p>(.*?)<\/p>/gs)) {
    const t = plain(m[1]).split(/\s+/).filter(Boolean).join(' ')
    if (t.length > 40) {
      if (t.length <= limit) return t
      const cut = t.slice(0, limit).replace(/\s+\S*$/, '')
      return cut.replace(/[,.;:]+$/, '') + '…'
    }
  }
  return ''
}

export function autoMinutes(p: Pick<Post, 'body' | 'faq' | 'title'>): number {
  const words = plain(p.body).split(/\s+/).filter(Boolean).length +
    p.faq.reduce((n, f) => n + f.q.split(/\s+/).length + f.a.join(' ').split(/\s+/).length, 0)
  return Math.max(1, Math.round(words / 200))
}

/** Main content of an article page (everything inside <main>). */
export function articleMain(p: Post, all: Post[], ctaBlockHtml: string): string {
  const cats = p.categories.length ? p.categories : [INDEX_LABEL]
  const img = postImage(p)
  const dateLine = p.published
    ? `<time datetime="${p.published}">${auDate(p.published)}</time>`
    : '<span class="needs-date">Publish date to be confirmed</span>'
  const hero = `<section class="page-hero article-hero">
<div class="container">
<div class="art-head">
${pill(primaryCategory(cats))}
<h1>${esc(p.title)}</h1>
<p class="art-meta">${dateLine}<span class="dot">·</span>${p.readMinutes} min read</p>
</div>
<figure class="art-figure">
<img src="${esc(img)}" alt="${esc(p.imageAlt)}" width="1200" height="630" fetchpriority="high">${
  p.imageCaption ? `<figcaption>${esc(p.imageCaption)}</figcaption>` : ''}
</figure>
</div>
</section>`
  const body = p.body.split(CTA_MARKER).join(ctaButtons())
  const article = '<section class="body-section article-body"><div class="container">' +
    `<div class="prose">${body}</div></div></section>`
  return [
    breadcrumbs([['Home', '/'], [INDEX_LABEL, INDEX_PATH], [p.title, postUrl(p)]]),
    hero, article, faqBlock(p.faq), disclaimerBlock(p.risk), relatedBlock(relatedFor(p, all)),
    ctaBlockHtml,
  ].join('\n')
}

export function articleNodes(p: Post, resolve: (s: string) => string): Record<string, unknown>[] {
  const cats = p.categories.length ? p.categories : [INDEX_LABEL]
  const url = postUrl(p)
  const author = (p.author || PRACTICE).trim()
  const bp: Record<string, unknown> = {
    '@type': 'BlogPosting',
    headline: resolve(p.title),
    description: resolve(p.seo.description),
    image: ORIGIN + postImage(p),
    author: author === PRACTICE
      ? { '@type': 'Organization', name: PRACTICE, '@id': ORIGIN + '/#practice' }
      : { '@type': 'Person', name: author },
    publisher: { '@type': 'Organization', name: PRACTICE,
      logo: { '@type': 'ImageObject', url: ORIGIN + '/assets/img/logo.png' } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': ORIGIN + url },
    inLanguage: 'en-AU',
    articleSection: cats,
    dateModified: p.modified,
  }
  if (/^https?:\/\//.test(postImage(p))) bp.image = postImage(p)
  if (p.published) bp.datePublished = p.published
  const trail: [string, string][] = [['Home', '/'], [INDEX_LABEL, INDEX_PATH], [p.title, url]]
  const nodes: Record<string, unknown>[] = [bp, {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(([label, href], i) => ({
      '@type': 'ListItem', position: i + 1, name: resolve(label), item: ORIGIN + href,
    })),
  }]
  if (p.faq.length) {
    nodes.push({
      '@type': 'FAQPage',
      mainEntity: p.faq.map((it) => ({
        '@type': 'Question', name: resolve(it.q),
        acceptedAnswer: { '@type': 'Answer', text: resolve(it.a.join(' ')) },
      })),
    })
  }
  return nodes
}

// ------------------------------------------------------------- the index
export function indexOrder(posts: Post[]): Post[] {
  const live = posts.filter(isLive).sort((a, b) => a.order - b.order)
  // newest first; a stable sort keeps equal dates in their original order
  return live.map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const ka = a.p.published || '0000'
      const kb = b.p.published || '0000'
      if (ka !== kb) return ka < kb ? 1 : -1
      return a.i - b.i
    })
    .map((x) => x.p)
}

export function articleIndex(posts: Post[]): string {
  const cards = indexOrder(posts)
  const counts = new Map<string, number>()
  for (const c of cards) {
    for (const cat of (c.categories.length ? c.categories : [INDEX_LABEL])) counts.set(cat, (counts.get(cat) ?? 0) + 1)
  }
  const catCounts = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  const chips = ['<button class="art-chip is-on" data-cat="all" aria-pressed="true">' +
    `All articles <span>${cards.length}</span></button>`]
  for (const [cat, n] of catCounts) {
    chips.push(`<button class="art-chip" data-cat="${esc(cat)}" aria-pressed="false">` +
      `${esc(cat)} <span>${n}</span></button>`)
  }
  const items = cards.map((c) => {
    const date = c.published
      ? `<time datetime="${c.published}">${auDate(c.published)}</time>`
      : '<span class="needs-date">Date to be confirmed</span>'
    const cats = c.categories.length ? c.categories : [INDEX_LABEL]
    return `<article class="art-card" data-cats="${esc(cats.join('|'))}">
<a class="art-card-img" href="${esc(postUrl(c))}" tabindex="-1" aria-hidden="true">
<img src="${esc(postImage(c))}" alt="" loading="lazy" width="1200" height="630"></a>
<div class="art-card-tx">
<p class="art-card-cat">${esc(primaryCategory(cats))}</p>
<h3><a href="${esc(postUrl(c))}">${esc(c.title)}</a></h3>
<p class="art-card-ex">${esc(c.excerpt || autoExcerpt(c.body))}</p>
<p class="art-card-foot">${date}<span class="dot">·</span>${c.readMinutes} min read</p>
<span class="art-card-more">Read more ${ICON_ARROW}</span>
</div>
</article>`
  })
  return `<section class="body-section article-index"><div class="container">
<div class="art-filters" role="group" aria-label="Filter articles by category">
${chips.join('')}
</div>
<p class="art-count" aria-live="polite"></p>
<div class="art-grid">
${items.join('')}
</div>
<nav class="art-pager" aria-label="Article pages"></nav>
</div></section>`
}

export function itemListNode(posts: Post[]): Record<string, unknown> {
  return {
    '@type': 'ItemList',
    itemListElement: indexOrder(posts).map((c, i) => ({
      '@type': 'ListItem', position: i + 1, url: ORIGIN + postUrl(c), name: c.title,
    })),
  }
}

export function sitemapArticles(posts: Post[]): string {
  const arts = posts.filter((p) => isLive(p) && !p.seo.noindex)
    .map((p) => [p.title, postUrl(p)] as const)
    .sort((a, b) => {
      const x = a[0].toLowerCase(); const y = b[0].toLowerCase()
      return x < y ? -1 : x > y ? 1 : 0
    })
  const lis = arts.map(([t, u]) => `<li><a href="${esc(u)}">${esc(t)}</a></li>`).join('')
  return '<div><h3>Dental Articles</h3><ul>' +
    `<li><a href="/blog/">All dental articles</a></li>${lis}</ul></div>`
}

// ---------------------------------------------------------------- team
export function teamGrid(team: TeamMember[]): string {
  return [...team].filter((m) => !m.hidden).sort((a, b) => a.order - b.order).map((m) => {
    const bio = String(m.bio || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
      .map((para) => `<p>${esc(para)}</p>`).join('')
    const quals = m.qualifications ? `<span class="quals">${esc(m.qualifications)}</span>` : ''
    const reg = m.registrationNumber ? `<span class="reg">AHPRA Registration: ${esc(m.registrationNumber)}</span>` : ''
    const link = m.profileUrl
      ? `<a class="explore" href="${esc(m.profileUrl)}">${esc(m.profileLinkText || `Read ${m.name}’s profile`)}` +
        `<span class="ic">${ICON_CHEV_RIGHT}</span></a>`
      : ''
    return '<article class="team-card reveal"><div class="ph">' +
      `<img src="${esc(m.photo)}" alt="${esc(m.photoAlt)}" loading="lazy" width="900" height="900"></div>` +
      `<div class="tx"><h3>${esc(m.name)}</h3><span class="role">${esc(m.role)}</span>${quals}${reg}${bio}${link}</div></article>`
  }).join('')
}
