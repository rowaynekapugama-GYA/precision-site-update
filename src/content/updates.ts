/**
 * Content updates: changes to pages that GYA ships in a release, applied once to the
 * dashboard's database as well as to the JSON in the repo.
 *
 * Once a practice has imported the site into the dashboard, the database is what
 * the website is built from, so a release that adds a section to an existing page
 * has to add it to the database too. Each update below is idempotent (it checks
 * whether its change is already there) and is recorded in the database once
 * applied, so a later edit in the dashboard is never undone by the next build.
 *
 *   npx tsx scripts/content-updates.ts --files   apply to content/ (GYA, once, when writing the release)
 *   npx tsx scripts/content-updates.ts           apply to the database (every build, before the pull)
 */
import type { BeforeAfterCase, Block, Content, Field, Page, Section, Settings, TeamMember } from '../render/types'
import { ICON_PILL } from '../render/leads'

export interface Editable {
  pages: Page[]
  blocks: Record<string, Block>
  team: TeamMember[]
  settings: Settings
  beforeAfter: BeforeAfterCase[]
  chrome?: { head: string; pre: string; post: string }
}

export interface ContentUpdate {
  id: string
  description: string
  /** change `c` in place (pulling anything new from `repo`) and say what changed */
  apply(c: Editable, repo: Content): string[]
}

// ------------------------------------------------------------------ helpers
const ARR = '<span class="arr"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>'

function page(c: Editable, key: string): Page | undefined {
  return c.pages.find((p) => p.key === key)
}

function nextKey(p: Page): string {
  const n = Math.max(0, ...p.sections.map((s) => parseInt(s.key.replace(/\D/g, ''), 10) || 0))
  return `s${n + 1}`
}

function nextFieldId(fields: Field[]): number {
  return Math.max(0, ...fields.map((f) => parseInt(f.id.replace(/\D/g, ''), 10) || 0)) + 1
}

/** Insert a section before the first one matching `before` (or at the end), once. */
function insertSection(p: Page, sec: Omit<Section, 'key'>, before: (s: Section) => boolean): boolean {
  if (p.sections.some((s) => s.ref && s.ref === sec.ref)) return false
  const at = p.sections.findIndex(before)
  const full = { key: nextKey(p), ...sec } as Section
  if (at < 0) p.sections.push(full)
  else p.sections.splice(at, 0, full)
  return true
}

/** Replace text in a template once, when the marker is not there yet. */
function editTemplate(sec: Section | undefined, find: string, replace: string, marker: string): boolean {
  if (!sec || !sec.template || sec.template.includes(marker) || !sec.template.includes(find)) return false
  sec.template = sec.template.replace(find, replace)
  return true
}

// ------------------------------------------------------- header and footer
const MEGA_ANCHOR = '<a class="mega-item" href="/invisalign-smileview-fortitude-valley/">'

/** Add New Patients and Health Funds to the Patients menus (desktop and mobile). */
export function patchNav(pre: string): string {
  if (pre.includes('href="/health-funds/"')) return pre
  const i = pre.indexOf(MEGA_ANCHOR)
  if (i >= 0) {
    const lineStart = pre.lastIndexOf('\n', i) + 1
    const lineEnd = pre.indexOf('\n', i)
    const line = pre.slice(lineStart, lineEnd)
    const chev = /(<svg[^]*<\/svg>)<\/a>\s*$/.exec(line)?.[1] ?? ''
    const indent = line.slice(0, line.indexOf('<'))
    const item = (href: string, img: string, text: string) =>
      `${indent}<a class="mega-item" href="${href}"><span class="mi-img"><img src="${img}" alt="" loading="lazy" width="120" height="120"></span><span class="mi-txt"><strong>${text}</strong></span>${chev}</a>\n`
    pre = pre.slice(0, lineStart) +
      item('/new-patients/', '/assets/img/menu/new-patients.webp', 'New Patients') +
      item('/health-funds/', '/assets/img/menu/health-funds.webp', 'Health Funds and Government Schemes') +
      pre.slice(lineStart)
  }
  pre = pre.replace('<li><a href="/invisalign-smileview-fortitude-valley/">Invisalign SmileView</a></li>',
    '<li><a href="/new-patients/">New Patients</a></li><li><a href="/health-funds/">Health Funds and Government Schemes</a></li><li><a href="/invisalign-smileview-fortitude-valley/">Invisalign SmileView</a></li>')
  return pre
}

/** Registration lines, Health Funds link, price list call to action, offer pop-up and leads.js. */
export function patchFooter(post: string): string {
  if (post.includes('{{site:registrations}}')) return post
  post = post.replace('{{site:parking}}</span>', '{{site:parking}}</span>{{site:registrations}}')
  post = post.replace(
    /(\n(\s*)<li><a href="\/price-list\/">Prices and Payment Options<\/a><\/li>)\n(\s*)<\/ul>/,
    (_m, li: string, ind: string, ulInd: string) =>
      `${li}\n${ind}<li><a href="/health-funds/">Health Funds and Government Schemes</a></li>` +
      `\n${ind}<li><a href="/new-patients/">New Patients</a></li>` +
      `\n${ulInd}</ul>` +
      `\n${ulInd}<a class="btn btn-white foot-cta" href="/price-list/#price-list" data-pl-cta="footer">Download Our Price List ${ARR}</a>`)
  post = post.replace('</footer>', '</footer>{{site:offerPopup}}')
  post = post.replace('<script src="/assets/js/main.js" defer></script>',
    '<script src="/assets/js/main.js" defer></script>\n<script src="/assets/js/leads.js" defer></script>')
  return post
}

// ------------------------------------------------------------- 14 Oct 2026
const BA_PAGES = [
  'service/cosmetic-dentistry', 'service/porcelain-veneers', 'service/composite-resin-veneers',
  'service/teeth-whitening', 'service/invisalign', 'service/dental-implants',
  'service/dental-crowns-and-bridges', 'service/cerec', 'service/dentures',
  'service/white-tooth-filling-restorations', 'service/restorative-dentistry',
]

const TODAY = '2026-10-14'
const touch = (p: Page | undefined) => { if (p && (!p.lastmod || p.lastmod < TODAY)) p.lastmod = TODAY }

const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'

function beforeAfterSection(treatment: string): Omit<Section, 'key'> {
  return {
    kind: 'content',
    before: '\n',
    label: 'Before and after gallery (shows only once a case is ready under Before & After)',
    pinned: false,
    generated: 'beforeAfter',
    ref: 'before-after',
    template: `<section class="ba-section" id="before-after"><div class="container reveal"><details class="ba-gallery"><summary><span class="pill">${ICON_PILL}{{f1}}</span><span class="ba-sum"><b>{{f2}}</b><span class="ba-count">{{gen:beforeAfterCount}}</span></span><span class="ba-chev">${CHEV}</span></summary><div class="ba-body"><p class="ba-intro">{{f3}}</p><div class="ba-grid">{{gen:beforeAfter}}</div><p class="ba-disclaimer">{{f4}}</p></div></details></div></section>`,
    fields: [
      { id: 'f1', label: 'Small label', type: 'text', value: 'Before &amp; After' },
      { id: 'f2', label: 'Heading', type: 'text', value: `${treatment} before and after photos` },
      { id: 'f3', label: 'Paragraph', type: 'text', value: 'These photographs show patients treated at Precision Dental, shared with their written consent. The photos have not been edited. Every patient&#x27;s situation is different, and a consultation is needed to know whether a treatment is suitable for you.' },
      { id: 'f4', label: 'Risk statement (always shown with the photos)', type: 'text', value: 'Any invasive procedure carries risks. Results vary between individuals. Seek a second opinion from an appropriately qualified health practitioner before proceeding.' },
    ],
  }
}

function priceListHomeSection(): Omit<Section, 'key'> {
  return {
    kind: 'content',
    before: '\n\n<!-- ================= PRICE LIST ================= -->\n',
    label: 'Download Our Price List',
    pinned: false,
    ref: 'price-list-home',
    template: `<section class="price-dl" id="price-list">\n  <div class="container price-dl-grid">\n    <div class="reveal-left">\n      <span class="pill">${ICON_PILL}{{f1}}</span>\n      <h2>{{f2}}</h2>\n      <p>{{f3}}</p>\n      <a class="btn btn-white" href="{{f4}}">{{f5}} ${ARR}</a>\n    </div>\n    <div class="form-card reveal-right" data-pl-location="home">{{site:priceListForm}}</div>\n  </div>\n</section>`,
    fields: [
      { id: 'f1', label: 'Small label', type: 'text', value: 'Fees' },
      { id: 'f2', label: 'Heading', type: 'text', value: 'Download Our Price List' },
      { id: 'f3', label: 'Paragraph', type: 'text', value: 'Our price list outlines the fees for many of our most common treatments, from a dental check-up and clean through to restorative and cosmetic care. Fill in your details and we will email you a copy.' },
      { id: 'f4', label: 'Link address', type: 'link', value: '/price-list/' },
      { id: 'f5', label: 'Button text', type: 'text', value: 'Prices and Payment Options' },
    ],
  }
}

function offerBannerSection(): Omit<Section, 'key'> {
  return {
    kind: 'content',
    before: '\n\n<!-- ================= NEW PATIENT OFFER ================= -->\n',
    label: 'New patient offer banner (wording and price are in Site Settings)',
    pinned: false,
    ref: 'offer-banner',
    template: '{{site:offerBanner}}',
    fields: [],
  }
}

function addLinkToSection(sec: Section | undefined, href: string, text: string): boolean {
  if (!sec || !sec.template || (sec.fields || []).some((f) => f.value === href)) return false
  const fields = sec.fields || (sec.fields = [])
  const n = nextFieldId(fields)
  const close = '</p></div></div></section>'
  if (!sec.template.endsWith(close)) return false
  sec.template = sec.template.slice(0, -close.length) + `</p>\n<p><a href="{{f${n}}}">{{f${n + 1}}}</a></p></div></div></section>`
  fields.push({ id: `f${n}`, label: 'Link address', type: 'link', value: href, group: 'more' })
  fields.push({ id: `f${n + 1}`, label: 'Link text', type: 'text', value: text, group: 'more' })
  return true
}

function addSitemapLinks(sec: Section | undefined, after: string, links: [string, string][]): boolean {
  if (!sec || !sec.template || !sec.fields) return false
  const fields = sec.fields
  if (links.every(([href]) => fields.some((f) => f.value === href))) return false
  const anchor = fields.find((f) => f.type === 'link' && f.value === after)
  if (!anchor) return false
  const textId = `f${parseInt(anchor.id.slice(1), 10) + 1}`
  const li = `<li><a href="{{${anchor.id}}}">{{${textId}}}</a></li>`
  if (!sec.template.includes(li)) return false
  let n = nextFieldId(fields)
  let extra = ''
  for (const [href, text] of links) {
    if (fields.some((f) => f.value === href)) continue
    extra += `<li><a href="{{f${n}}}">{{f${n + 1}}}</a></li>`
    fields.push({ id: `f${n}`, label: 'Link address', type: 'link', value: href })
    fields.push({ id: `f${n + 1}`, label: 'Link text', type: 'text', value: text })
    n += 2
  }
  sec.template = sec.template.replace(li, li + extra)
  return true
}

export const UPDATES: ContentUpdate[] = [
  {
    id: '2026-10-14-revisions',
    description: 'New patient offer, reviews badge, price list form, Health Funds page, AHPRA registration, before and after galleries',
    apply(c, repo) {
      const done: string[] = []

      // new pages, taken from the release
      for (const key of ['health-funds', 'new-patients', 'new-patient-offer-terms']) {
        if (!page(c, key)) {
          const p = repo.pages.find((x) => x.key === key)
          if (p) { c.pages.push(JSON.parse(JSON.stringify(p))); done.push(`added page ${p.url}`) }
        }
      }

      // menus and footer (the homepage keeps its own copy of both)
      const home = page(c, 'index')
      for (const p of [home].filter(Boolean) as Page[]) {
        if (p.layout.pre !== 'std') { const v = patchNav(p.layout.pre); if (v !== p.layout.pre) { p.layout.pre = v; done.push(`${p.key}: menu`) } }
        if (p.layout.post !== 'std') { const v = patchFooter(p.layout.post); if (v !== p.layout.post) { p.layout.post = v; done.push(`${p.key}: footer`) } }
      }
      if (c.chrome) {
        const pre = patchNav(c.chrome.pre); const post = patchFooter(c.chrome.post)
        if (pre !== c.chrome.pre || post !== c.chrome.post) { c.chrome.pre = pre; c.chrome.post = post; done.push('chrome: menu and footer') }
      }

      if (home) {
        touch(home)
        // reviews badge under the hero buttons (renders nothing until switched on)
        const hero = home.sections.find((s) => s.kind === 'header')
        if (editTemplate(hero, '</div>\n      <div class="hero-chips">', '</div>{{site:reviewsBadge}}\n      <div class="hero-chips">', '{{site:reviewsBadge}}')) done.push('index: reviews badge')
        // offer banner straight after the hero
        const heroIdx = home.sections.findIndex((s) => s.kind === 'header')
        const after = home.sections[heroIdx + 1]
        if (insertSection(home, offerBannerSection(), (s) => s === after)) done.push('index: offer banner')
        // price list call to action before Book Your Visit
        if (insertSection(home, priceListHomeSection(), (s) => s.shared === 'cta')) done.push('index: price list section')
        // the CDBS and health fund cards now point to the new page
        const offers = home.sections.find((s) => (s.label || '').startsWith('Special Offers'))
        for (const f of offers?.fields || []) {
          if (f.type === 'link' && f.value === '/price-list/' && (f.group === '1' || f.group === '2')) {
            f.value = '/health-funds/'
            done.push(`index: offers card ${f.group} links to /health-funds/`)
          }
        }
      }

      // Prices and Payment Options: the form the page already promises, and links to the new page
      const prices = page(c, 'price-list')
      if (prices) {
        touch(prices)
        const dl = prices.sections.find((s) => s.label === 'Download Our Price List')
        if (editTemplate(dl, '<section class="body-section{{alt}}">', '<section class="body-section{{alt}}" id="price-list">', 'id="price-list"')) done.push('price-list: anchor')
        if (editTemplate(dl, '<p>{{f3}}</p></div>', '<p>{{f3}}</p>\n<div class="form-card pl-card" data-pl-location="price-list">{{site:priceListForm}}</div></div>', '{{site:priceListForm}}')) done.push('price-list: form')
        if (addLinkToSection(prices.sections.find((s) => s.label === 'Child Dental Benefits Schedule'), '/health-funds/', 'More about the Child Dental Benefits Schedule')) done.push('price-list: CDBS link')
        if (addLinkToSection(prices.sections.find((s) => (s.label || '').startsWith('Department of Veterans')), '/health-funds/', 'More about DVA dental care')) done.push('price-list: DVA link')
      }

      // Dr Choi's registration on his profile (the page said it was to be confirmed)
      const choi = page(c, 'our-team/dentist-fortitude-valley-dr-billy-choi')
      for (const f of choi?.sections.flatMap((s) => s.fields || []) || []) {
        if (/number to be confirmed/i.test(f.value)) { f.value = 'General Dentist, AHPRA Registration: DEN0000958417'; touch(choi); done.push('dr choi: registration') }
      }

      // before and after galleries, empty (and invisible) until cases are added
      for (const key of BA_PAGES) {
        const p = page(c, key)
        if (!p) continue
        const name = p.label.replace(/\s+in Fortitude Valley$/i, '')
        const target = p.sections.find((s) => s.kind === 'faq') ||
          p.sections.find((s) => (s.label || '').startsWith('You may also')) ||
          p.sections.find((s) => s.shared === 'cta')
        if (insertSection(p, beforeAfterSection(name), (s) => s === target)) done.push(`${key}: before and after`)
      }

      // the HTML sitemap
      const sm = page(c, 'sitemap')
      const smSec = sm?.sections.find((s) => s.generated === 'sitemapArticles')
      if (addSitemapLinks(smSec, '/price-list/', [['/new-patients/', 'New Patients'], ['/health-funds/', 'Health Funds and Government Schemes']])) { touch(sm); done.push('sitemap: new pages') }

      // team: Dr Choi's registration (from the release, only if not already set)
      for (const m of c.team) {
        const r = repo.team.find((x) => x.name === m.name)
        if (r?.registrationNumber && !m.registrationNumber) {
          m.registrationNumber = r.registrationNumber
          m.registrationType = r.registrationType || ''
          done.push(`team: ${m.name} registration`)
        }
      }

      // settings: the offer, badge, price list and scheme switches, when not set yet
      const s = c.settings, rs = repo.settings
      if (!String(s.offer?.price || '').trim() && rs.offer?.price) { s.offer = { ...rs.offer }; done.push('settings: new patient offer') }
      if (!s.reviews?.count && rs.reviews) { s.reviews = { ...rs.reviews }; done.push(`settings: Google reviews (${rs.reviews.enabled ? 'on' : 'off'})`) }
      if (!s.priceList?.consentText && rs.priceList) { s.priceList = { ...rs.priceList }; done.push('settings: price list') }
      return done
    },
  },
  {
    id: '2026-10-15-centred-popup',
    description: 'The new patient offer pop-up opens in the middle of the screen two seconds after the first page loads',
    apply(c) {
      const done: string[] = []
      // only if it still has the 14 October default (20 seconds); a delay the practice chose is kept
      if (c.settings.offer && Number(c.settings.offer.popupDelay) === 20) {
        c.settings.offer.popupDelay = 2
        done.push('settings: pop-up after 2 seconds')
      }
      return done
    },
  },
  {
    id: '2026-10-15-reviews-band',
    description: '"Over 500 Google Reviews" band on the homepage, under the offer strip (replaces the hero badge)',
    apply(c) {
      const done: string[] = []
      const home = page(c, 'index')
      if (home) {
        const after = home.sections.findIndex((s) => s.ref === 'offer-banner')
        const at = after >= 0 ? after + 1 : home.sections.findIndex((s) => s.kind === 'header') + 1
        const target = home.sections[at]
        const added = insertSection(home, {
          kind: 'content',
          before: '\n\n<!-- ================= GOOGLE REVIEWS ================= -->\n',
          label: 'Google reviews band (number of reviews, rating and link are in Site Settings)',
          pinned: false,
          ref: 'reviews-band',
          template: '{{site:reviewsBand}}',
          fields: [],
        }, (s) => s === target)
        if (added) { done.push('index: Google reviews band'); touch(home) }
      }
      // the practice asked for it (15 October): switch it on with their count, unless already set up
      if (c.settings.reviews && String(c.settings.reviews.count).trim() === '500+' && !c.settings.reviews.enabled) {
        c.settings.reviews = { ...c.settings.reviews, enabled: true, count: '500' }
        done.push('settings: reviews band on, 500 reviews')
      }
      return done
    },
  },
  {
    id: '2026-10-16-hygienist-registrations',
    description: 'Dental hygienists Ivan Yang and Mobina Rezayee, with their AHPRA registration numbers (from the practice, 16 October)',
    apply(c) {
      const done: string[] = []
      const people = [
        { name: 'Ivan Yang', registrationNumber: 'DEN0004030046' },
        { name: 'Mobina Rezayee', registrationNumber: 'DEN0004029897' },
      ]
      // clinicians first: straight after the dentist and the oral health therapist
      const clinical = c.team.filter((m) => /dentist|therapist|hygienist/i.test(m.role) && !people.some((p) => p.name.toLowerCase() === m.name.toLowerCase()))
      let order = clinical.length ? Math.max(...clinical.map((m) => m.order)) : 0
      for (const p of people) {
        const existing = c.team.find((m) => m.name.trim().toLowerCase() === p.name.toLowerCase())
        if (existing) {
          if (!existing.registrationNumber) {
            existing.registrationNumber = p.registrationNumber
            existing.registrationType = existing.registrationType || 'Dental Hygienist'
            done.push(`team: ${p.name} registration`)
          }
          continue
        }
        order += 1
        for (const m of c.team) if (m.order >= order) m.order += 1
        c.team.push({
          name: p.name, role: 'Dental Hygienist', qualifications: '', photo: '', photoAlt: '', bio: '',
          profileUrl: '', profileLinkText: '', hidden: false, order,
          registrationType: 'Dental Hygienist', registrationNumber: p.registrationNumber,
        })
        done.push(`team: added ${p.name}, Dental Hygienist`)
      }
      if (done.length) {
        const team = c.pages.find((pg) => pg.key === 'our-team')
        if (team) touch(team)
      }
      return done
    },
  },
]
