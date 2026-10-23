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
import type { BeforeAfterCase, Block, Content, Field, Page, Post, Section, Settings, TeamMember } from '../render/types'
import { ICON_PILL } from '../render/leads'

export interface Editable {
  pages: Page[]
  blocks: Record<string, Block>
  team: TeamMember[]
  settings: Settings
  beforeAfter: BeforeAfterCase[]
  chrome?: { head: string; pre: string; post: string }
  /** blog posts; an update that changes one is written back (20 October 2026) */
  posts?: Post[]
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

// ------------------------------------------------------------- 19 Oct 2026
// Client changes round 2 (email thread 14 to 17 October): October 2026 price list,
// payment options, health funds, CDBS and DVA wording, service area, contact details.
const ROUND2 = '2026-10-19'
const touch2 = (p: Page | undefined) => { if (p && (!p.lastmod || p.lastmod < ROUND2)) p.lastmod = ROUND2 }
const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
const OLD_PAYMENTS = /american express/i

export const HICAPS_TEXT = 'We accept most private health insurance benefits using HICAPS, so you can claim on the spot and pay only the gap. No manual lodgement needed.'
export const SERVICE_AREA = 'Located in Fortitude Valley, serving patients from Newstead, New Farm, Teneriffe, Bowen Hills and all Brisbane metro areas.'
export const AREA_SERVED = 'Fortitude Valley, Newstead, New Farm, Teneriffe, Bowen Hills, Brisbane'

function field(sec: Section | undefined, id: string): Field | undefined {
  return sec?.fields?.find((f) => f.id === id)
}

/** Set a field's value; says whether it changed. */
function setField(sec: Section | undefined, id: string, value: string, label?: string): boolean {
  const f = field(sec, id)
  if (!f || f.value === value) return false
  f.value = value
  if (label) f.label = label
  return true
}

export function feeTableSection(): Omit<Section, 'key'> {
  return {
    kind: 'content', before: '\n', altAuto: true, alt: false, pinned: false, ref: 'fee-table',
    label: 'Our Fees (the table comes from data/price-list.json)',
    template: '<section class="body-section{{alt}}" id="fees"><div class="container reveal"><h2>{{f1}}</h2><div class="prose fee-intro"><p>{{f2}}</p></div>{{site:priceTable}}</div></section>',
    fields: [
      { id: 'f1', label: 'Heading', type: 'text', value: 'Our Fees' },
      { id: 'f2', label: 'Paragraph', type: 'text', value: 'Fees for our most common treatments, with their ADA item numbers. You can also download the price list as a PDF using the form below.' },
    ],
  } as Omit<Section, 'key'>
}

export function planOptionsSection(): Omit<Section, 'key'> {
  return {
    kind: 'content', before: '\n', altAuto: true, alt: false, pinned: false, ref: 'payment-plan-options',
    label: 'Flexible Payment Plans',
    template: '<section class="body-section{{alt}}" id="payment-plan-options"><div class="container split reveal"><h2>{{f1}}</h2><div class="prose"><p>{{f2}}</p></div></div></section>',
    fields: [
      { id: 'f1', label: 'Heading', type: 'text', value: 'Flexible Payment Plans' },
      { id: 'f2', label: 'Paragraph', type: 'text', value: 'Flexible payment plan options are available, including interest-free plans. Contact us to find the right option for you.' },
    ],
  } as Omit<Section, 'key'>
}

const ticks = (ids: string[]) => `<ul class="check-list">${ids.map((id) => `<li>${TICK}<span>{{${id}}}</span></li>`).join('')}</ul>`

/** Health Funds: the expanded CDBS section (checked against the CDBS guide, Version 14, and Services Australia). */
export function cdbsSection(): Pick<Section, 'template' | 'fields' | 'label'> {
  const T = (id: string, label: string, value: string): Field => ({ id, label, type: 'text', value })
  return {
    label: 'Child Dental Benefits Schedule (CDBS)',
    template: '<section class="body-section{{alt}}" id="cdbs"><div class="container reveal"><h2>{{f1}}</h2><div class="prose"><p>{{f2}}</p>\n' +
      '<h3>{{f3}}</h3>\n<p>{{f4}}</p>\n' + ticks(['f5', 'f6', 'f7']) + '\n' +
      '<h3>{{f8}}</h3>\n<p>{{f9}}</p>\n<p>{{f10}}</p>\n' + ticks(['f11', 'f12', 'f13', 'f14', 'f15', 'f16', 'f17', 'f18', 'f19']) + '\n' +
      '<h3>{{f20}}</h3>\n<ul><li>{{f21}}</li><li>{{f22}}</li><li>{{f23}}</li></ul>\n' +
      '<h3>{{f24}}</h3>\n<p>{{f25}}</p>\n<p>{{f26}}</p>\n<p>{{f27}}</p>{{site:cdbsBulkBillLine}}\n' +
      '<p><a href="{{f28}}" target="_blank" rel="noopener">{{f29}}</a></p>\n' +
      '<p class="scheme-note">{{f30}}</p></div></div></section>',
    fields: [
      T('f1', 'Heading', 'Child Dental Benefits Schedule (CDBS)'),
      T('f2', 'Paragraph', 'The Child Dental Benefits Schedule is a government-funded Medicare program that helps cover the cost of basic dental services for eligible children aged 0 to 17.'),
      T('f3', 'Subheading', 'Who is eligible'),
      T('f4', 'Paragraph', 'Generally, a child is eligible if they are:'),
      T('f5', 'List item', 'Aged 0 to 17 at any point in the calendar year'),
      T('f6', 'List item', 'Eligible for Medicare'),
      T('f7', 'List item', 'Receiving Family Tax Benefit Part A or another relevant Australian Government payment at some point in the year, or with a parent, carer or guardian who does'),
      T('f8', 'Subheading', 'What the benefit covers'),
      T('f9', 'Paragraph', 'Eligible children can receive up to $1,158 in benefits over two consecutive calendar years when their two-year period starts in 2026. For children whose period started in 2025, the cap is $1,132. The cap is indexed each year and depends on eligibility.'),
      T('f10', 'Paragraph', 'The CDBS covers basic dental services, such as:'),
      T('f11', 'List item', 'Examinations'),
      T('f12', 'List item', 'X-rays'),
      T('f13', 'List item', 'Cleaning'),
      T('f14', 'List item', 'Fluoride treatment'),
      T('f15', 'List item', 'Fissure sealants'),
      T('f16', 'List item', 'Fillings'),
      T('f17', 'List item', 'Root canals'),
      T('f18', 'List item', 'Extractions'),
      T('f19', 'List item', 'Partial dentures'),
      T('f20', 'Subheading', 'What it does not cover'),
      T('f21', 'List item', 'Orthodontic treatment, such as braces'),
      T('f22', 'List item', 'Cosmetic treatment'),
      T('f23', 'List item', 'Services provided in hospital'),
      T('f24', 'Subheading', 'How to access it'),
      T('f25', 'Paragraph', 'You can check your child&#x27;s eligibility and remaining balance through your Medicare online account in myGov (select History and statements, then Child Dental Benefits Schedule). You can also ask our team at the appointment, and we will check for you.'),
      T('f26', 'Paragraph', 'Please bring your child&#x27;s Medicare card to the appointment.'),
      T('f27', 'Paragraph', 'Ask our team how CDBS billing works at our practice.'),
      { id: 'f28', label: 'Link address', type: 'link', value: 'https://www.servicesaustralia.gov.au/child-dental-benefits-schedule', group: 'more' },
      { id: 'f29', label: 'Link text', type: 'text', value: 'Child Dental Benefits Schedule on the Services Australia website', group: 'more' },
      T('f30', 'Small print', 'Benefit amounts and eligibility are set by the Australian Government and may change. Please contact us or Services Australia to confirm your child&#x27;s eligibility.'),
    ],
  }
}

export function dvaSection(): Pick<Section, 'template' | 'fields' | 'label'> {
  return {
    label: 'Department of Veterans\' Affairs (DVA)',
    template: '<section class="body-section{{alt}}" id="dva"><div class="container split reveal"><h2>{{f1}}</h2><div class="prose"><p>{{f2}}</p>{{site:dvaBillingLine}}</div></div></section>',
    fields: [
      { id: 'f1', label: 'Heading', type: 'text', value: 'Department of Veterans&#x27; Affairs (DVA)' },
      { id: 'f2', label: 'Paragraph', type: 'text', value: DVA_TEXT },
    ],
  }
}

export const DVA_TEXT = 'We welcome eligible Department of Veterans&#x27; Affairs (DVA) patients. Please bring your Veteran Card to your appointment and our team will explain what&#x27;s covered.'

const SUPERCARE_INTRO = 'My SuperCare helps Australians access necessary dental treatment by easing the financial pressure of its cost. It works with the Australian Taxation Office under strict guidelines, and the application process is simple, so you can get the treatment you need sooner.'

/** The service area line under the address in a footer. */
export function patchFooterArea(post: string): string {
  if (post.includes('{{site:footServiceArea}}')) return post
  return post.replace('<p>{{site:address}}</p>', '<p>{{site:address}}</p>{{site:footServiceArea}}')
}

UPDATES.push({
  id: '2026-10-19-client-round-2',
  description: 'October 2026 price list (fee table and PDF), payment options, health funds, CDBS and DVA wording, service area and contact details',
  apply(c) {
    const done: string[] = []
    const s = c.settings

    // ---- Site Settings
    if (s.phone !== '(07) 3852 1160') { s.phone = '(07) 3852 1160'; done.push('settings: phone') }
    if (s.email !== 'admin@precisiondentistry.com.au') { s.email = 'admin@precisiondentistry.com.au'; done.push('settings: email') }
    if (s.address?.street === '520 Wickham Street') { s.address.street = '520 Wickham St'; done.push('settings: street') }
    if (s.address && !String(s.address.crossStreet || '').trim()) { s.address.crossStreet = 'Corner of Brookes St'; done.push('settings: cross street') }
    if (!String(s.serviceAreaLine || '').trim()) { s.serviceAreaLine = SERVICE_AREA; done.push('settings: service area line') }
    if (!String(s.areaServed || '').trim()) { s.areaServed = AREA_SERVED; done.push('settings: areas served') }
    if (!s.paymentAccepted || OLD_PAYMENTS.test(s.paymentAccepted)) { s.paymentAccepted = 'EFTPOS, Visa, Mastercard, Cash'; done.push('settings: payment methods') }
    if (s.offer && /^Scale and polish$/m.test(s.offer.inclusions || '')) {
      s.offer.inclusions = s.offer.inclusions.replace(/^Scale and polish$/m, 'Scale and polish (professional clean)')
      done.push('settings: offer inclusions')
    }
    if (s.schemes && !s.schemes.hicaps) { s.schemes.hicaps = true; done.push('settings: HICAPS confirmed') }
    // every form now hands out the October 2026 PDF the build writes (an older upload is let go)
    if (s.priceList && (s.priceList.file || s.priceList.fileDoc)) {
      s.priceList.file = ''
      delete s.priceList.fileDoc
      done.push('settings: price list PDF is now the October 2026 edition')
    }

    // ---- Prices and Payment Options
    const prices = page(c, 'price-list')
    if (prices) {
      const by = (label: string) => prices.sections.find((x) => (x.label || '').startsWith(label))
      const dl = by('Download Our Price List')
      if (insertSection(prices, feeTableSection(), (x) => x === dl)) done.push('price-list: fee table')
      if (setField(by('Health Fund Claims with HICAPS'), 'f2', HICAPS_TEXT)) done.push('price-list: HICAPS')
      if (setField(by('Payment Methods'), 'f2', 'We accept EFTPOS, Visa, Mastercard and cash.')) done.push('price-list: payment methods')
      const dc = by('Interest-Free Payment Plans with DentiCare')
      if (editTemplate(dc, '<section class="body-section{{alt}}">', '<section class="body-section{{alt}}" id="payment-plans">', 'id="payment-plans"')) done.push('price-list: payment plans anchor')
      if (setField(dc, 'f2', 'DentiCare offers interest-free payment plans for dental treatment between $3,000 and $12,000. A 20% deposit is paid before treatment starts, and the balance is spread over 12 to 18 months, with weekly, fortnightly or monthly payments. A small set-up fee applies. Eligibility criteria, terms and conditions apply. Our team can explain how the plan works and help you apply.')) done.push('price-list: DentiCare')
      const sc = by('Accessing Your Superannuation with')
      if (sc) {
        if (setField(sc, 'f1', 'Accessing Your Superannuation with My SuperCare')) { sc.label = 'Accessing Your Superannuation with My SuperCare'; done.push('price-list: My SuperCare heading') }
        const f2 = field(sc, 'f2')
        if (f2 && !f2.value.includes(SUPERCARE_INTRO)) {
          f2.value = `${SUPERCARE_INTRO} ${f2.value.replace('SuperCare is an independent service', 'My SuperCare is an independent service')}`
          done.push('price-list: My SuperCare')
        }
        const after = prices.sections[prices.sections.indexOf(sc) + 1]
        if (insertSection(prices, planOptionsSection(), (x) => x === after)) done.push('price-list: flexible payment plans')
      }
      const cdbs = by('Child Dental Benefits Schedule')
      const cf = field(cdbs, 'f2')
      if (cf && !cf.value.includes('how CDBS billing works')) { cf.value += ' Ask our team how CDBS billing works at our practice.'; done.push('price-list: CDBS billing line') }
      if (setField(by('Department of Veterans'), 'f2', DVA_TEXT)) done.push('price-list: DVA')
      if (done.some((d) => d.startsWith('price-list'))) touch2(prices)
    }

    // ---- Health Funds and Government Schemes
    const hf = page(c, 'health-funds')
    if (hf) {
      const n = done.length
      const priv = hf.sections.find((x) => (x.template || '').includes('id="private-health-funds"'))
      if (setField(priv, 'f2', 'We accept most health funds and are a preferred provider for {{site:preferredFunds}}. This means members of these funds receive maximum benefits, based on their level of cover, when they claim on the spot. Ask us about yours!')) done.push('health-funds: preferred providers')
      if (editTemplate(priv, '<p>{{f2}}</p>\n<p>{{f3}}</p>{{site:hicapsLine}}', '<p>{{f2}}</p>{{site:hicapsLine}}\n<h3>{{f3}}</h3>\n{{site:fundsList}}', '{{site:fundsList}}')) {
        setField(priv, 'f3', 'Funds and schemes we accept', 'Subheading')
        done.push('health-funds: list of funds')
      }
      const cdbs = hf.sections.find((x) => (x.template || '').includes('id="cdbs"'))
      if (cdbs && !(cdbs.template || '').includes('{{f30}}')) { Object.assign(cdbs, cdbsSection()); done.push('health-funds: CDBS') }
      const dva = hf.sections.find((x) => (x.template || '').includes('id="dva"'))
      if (dva && !(dva.fields || []).some((f) => f.value === DVA_TEXT)) { Object.assign(dva, dvaSection()); done.push('health-funds: DVA') }
      if (done.length > n) touch2(hf)
    }

    // ---- service area line: footers (the homepage keeps its own) and the contact block
    const home = page(c, 'index')
    if (home && home.layout.post !== 'std') {
      const v = patchFooterArea(home.layout.post)
      if (v !== home.layout.post) { home.layout.post = v; touch2(home); done.push('index: footer service area') }
    }
    if (c.chrome) {
      const v = patchFooterArea(c.chrome.post)
      if (v !== c.chrome.post) { c.chrome.post = v; done.push('chrome: footer service area') }
    }
    const contact = c.blocks?.contact
    if (contact && contact.template && !contact.template.includes('{{site:mapServiceArea}}') && contact.template.includes('<p>{{site:addressLines}}</p>')) {
      contact.template = contact.template.replace('<p>{{site:addressLines}}</p>', '<p>{{site:addressLines}}</p>{{site:mapServiceArea}}')
      done.push('contact block: service area')
    }
    return done
  },
})


// ------------------------------------------------------------- 20 Oct 2026
// Dr Choi's email of 20 October: the price list only through the form, Invisalign $6,000
// (data/price-list.json and the PDF), American Express, no "Flexible Payment Plans" section,
// the address exactly as on the Google Business Profile, and the $229 offer is ongoing.
const ROUND3 = '2026-10-20'
const touch3 = (p: Page | undefined) => { if (p && (!p.lastmod || p.lastmod < ROUND3)) p.lastmod = ROUND3 }
export const PAYMENT_METHODS = 'EFTPOS, Visa, Mastercard, American Express, Cash'
export const OFFER_TERMS_LINE = 'Ongoing offer for new patients. Additional X-rays or treatment are charged separately if required.'
export const OFFER_TERMS = [
  'The $229 New Patient Offer is an ongoing offer for new patients of Precision Dental.',
  'It includes a comprehensive examination, 2 intraoral X-rays, intraoral photos, a scale and polish (professional clean) and a fluoride treatment.',
  'Additional X-rays or treatment are charged separately if required.',
].join('\n\n')
const FINDING_US = 'You&#x27;ll find us on the corner of Wickham and Brookes Streets.'

/** Replace text in a field once (when the old text is there and the new is not). */
function swapText(sec: Section | undefined, id: string, from: string, to: string): boolean {
  const f = field(sec, id)
  if (!f || !f.value.includes(from) || f.value.includes(to)) return false
  f.value = f.value.replace(from, to)
  return true
}

UPDATES.push({
  id: '2026-10-20-client-round-3',
  description: 'Price list only through the form, American Express, no Flexible Payment Plans section, address as on Google, $229 offer ongoing',
  apply(c) {
    const done: string[] = []
    const s = c.settings

    // ---- Site Settings
    if (s.paymentAccepted !== PAYMENT_METHODS) { s.paymentAccepted = PAYMENT_METHODS; done.push('settings: American Express') }
    if (s.address && String(s.address.crossStreet || '').trim()) { s.address.crossStreet = ''; done.push('settings: address without the cross street') }
    if (s.offer) {
      if (s.offer.termsLine !== OFFER_TERMS_LINE) { s.offer.termsLine = OFFER_TERMS_LINE; done.push('settings: offer terms line (ongoing)') }
      if (String(s.offer.period || '').trim()) { s.offer.period = ''; done.push('settings: no offer dates') }
      if (!String(s.offer.terms || '').trim()) { s.offer.terms = OFFER_TERMS; done.push('settings: full offer terms') }
    }

    // ---- Prices and Payment Options: no fee table, no Flexible Payment Plans
    const prices = page(c, 'price-list')
    if (prices) {
      const n = done.length
      const before = prices.sections.length
      prices.sections = prices.sections.filter((x) => x.ref !== 'fee-table' && x.ref !== 'payment-plan-options')
      if (prices.sections.length !== before) done.push(`price-list: removed ${before - prices.sections.length} section(s) (fee table, Flexible Payment Plans)`)
      const dl = prices.sections.find((x) => (x.label || '').startsWith('Download Our Price List'))
      if (setField(dl, 'f2', 'Get our full 2026 price list, with the fees for our most common treatments, from check-ups and cleans to restorative and cosmetic care. Enter your details and we&#x27;ll send it straight to you.')) done.push('price-list: download intro')
      if (setField(prices.sections.find((x) => (x.label || '').startsWith('Payment Methods')), 'f2', 'We accept EFTPOS, Visa, Mastercard, American Express and cash.')) done.push('price-list: American Express')
      if (done.length > n) touch3(prices)
    }

    // ---- Contact: the corner as a directions note, not part of the address
    const contact = page(c, 'contact')
    const getting = contact?.sections.find((x) => (x.label || '').startsWith('Getting Here'))
    const g2 = field(getting, 'f2')
    if (g2 && !g2.value.includes('corner of Wickham and Brookes')) {
      const i = g2.value.indexOf('. ')
      g2.value = i > 0 ? `${g2.value.slice(0, i + 1)} ${FINDING_US}${g2.value.slice(i + 1)}` : `${g2.value} ${FINDING_US}`
      touch3(contact)
      done.push('contact: finding us note')
    }

    // ---- About Us: no "Flexible Payment" heading
    const about = page(c, 'about-us')
    const fees = about?.sections.find((x) => (x.label || '').startsWith('Transparent Fees and Flexible Payment'))
    if (fees) {
      if (setField(fees, 'f1', 'Transparent Fees and Payment Options')) { fees.label = 'Transparent Fees and Payment Options'; done.push('about-us: heading') }
      if (swapText(fees, 'f2', 'and interest-free payment plans.', 'and interest-free payment plans through DentiCare.')) done.push('about-us: DentiCare named')
      touch3(about)
    }

    // ---- other "interest-free" mentions: DentiCare named, so it is the only plan on the site
    const home = page(c, 'index')
    const why = home?.sections.find((x) => (x.label || '').startsWith('Why Choose Precision Dental'))
    if (swapText(why, 'f10', 'and interest-free payment plans help', 'and interest-free payment plans through DentiCare help')) { touch3(home); done.push('index: DentiCare named') }
    const smileview = page(c, 'invisalign-smileview-fortitude-valley')
    const consult = smileview?.sections.find((x) => (x.label || '').startsWith('Your Invisalign Consultation'))
    if (swapText(consult, 'f3', 'including interest-free plans for eligible patients.', 'including interest-free payment plans through DentiCare for eligible patients.')) { touch3(smileview); done.push('invisalign-smileview: DentiCare named') }
    const invis = page(c, 'service/invisalign')
    const whyInvis = invis?.sections.find((x) => (x.label || '').startsWith('Why Choose Precision Dental for Invisalign'))
    if (swapText(whyInvis, 'f2', 'interest-free payment plans are available to eligible patients.', 'interest-free payment plans are available through DentiCare for eligible patients.')) { touch3(invis); done.push('service/invisalign: DentiCare named') }
    for (const p of c.posts || []) {
      for (const q of p.faq || []) {
        q.a = q.a.map((a) => {
          if (a !== 'Yes, interest-free payment plans are available to eligible patients, subject to terms and conditions.') return a
          done.push(`post ${p.slug}: DentiCare named`)
          return 'Yes, interest-free payment plans are available through DentiCare for eligible patients, subject to terms and conditions.'
        })
      }
    }

    // ---- the blog post that lists payment methods
    for (const p of c.posts || []) {
      if (p.body && p.body.includes('We accept EFTPOS, Visa, Mastercard and cash.')) {
        p.body = p.body.replace('We accept EFTPOS, Visa, Mastercard and cash.', 'We accept EFTPOS, Visa, Mastercard, American Express and cash.')
        done.push(`post ${p.slug}: American Express`)
      }
    }
    return done
  },
})

// ---------------------------------------------------------------- 21 October 2026: a few everyday fees
// Client feedback: do not list every fee on Prices and Payment Options, prompt people to download the
// price list with their details. A few everyday fees ({{site:priceTeaser}}, from data/price-list.json)
// sit just above the form; everything else stays in the PDF.
UPDATES.push({
  id: '2026-10-21-price-teaser',
  description: 'A few everyday fees above the price list form on Prices and Payment Options',
  apply(c) {
    const done: string[] = []
    const prices = page(c, 'price-list')
    const dl = prices?.sections.find((x) => (x.label || '').startsWith('Download Our Price List'))
    if (editTemplate(dl, '<div class="form-card pl-card"', '{{site:priceTeaser}}<div class="form-card pl-card"', '{{site:priceTeaser}}')) {
      if (prices && (!prices.lastmod || prices.lastmod < '2026-10-21')) prices.lastmod = '2026-10-21'
      done.push('price-list: everyday fees above the form')
    }
    return done
  },
})

// ---------------------------------------------------------------- 21 October 2026: shorter price list section
// The everyday fees move to the left column under the heading, so the intro and the form on the right
// are no longer one long column. Mobile order: heading, intro, fees, form.
const PL_TEMPLATE_OLD = '<div class="container split reveal"><h2>{{f1}}</h2><div class="prose"><p>{{f2}}</p>\n<p>{{f3}}</p>\n{{site:priceTeaser}}<div class="form-card pl-card" data-pl-location="price-list">{{site:priceListForm}}</div></div></div>'
const PL_TEMPLATE_NEW = '<div class="container pl-split reveal"><h2 class="pl-head">{{f1}}</h2><div class="prose pl-copy"><p>{{f2}}</p>\n<p>{{f3}}</p></div>\n{{site:priceTeaser}}<div class="form-card pl-card" data-pl-location="price-list">{{site:priceListForm}}</div></div>'
UPDATES.push({
  id: '2026-10-21-price-list-layout',
  description: 'Price list section: everyday fees in the left column, intro and form on the right',
  apply(c) {
    const prices = page(c, 'price-list')
    const dl = prices?.sections.find((x) => (x.label || '').startsWith('Download Our Price List'))
    if (!editTemplate(dl, PL_TEMPLATE_OLD, PL_TEMPLATE_NEW, 'pl-split')) return []
    return ['price-list: two-column price list section']
  },
})

// ---------------------------------------------------------------- 23 October 2026: client revisions round 4
// Billy's emails of 20 and 23 October: address exactly as on Google, the $229 offer as the only price
// on the site, DentiCare the only place that says interest-free, the Google listing in the map, a HICAPS
// health fund logo grid, and the practice's own videos on the pages where they fit.
const ROUND4 = '2026-10-23'
const touch4 = (p: Page | undefined) => { if (p && (!p.lastmod || p.lastmod < ROUND4)) p.lastmod = ROUND4 }
export const GOOGLE_LISTING = 'https://maps.google.com/?cid=17715398836985474154'
/** The Precision Dental listing itself (place card, pin and rating), from its Google feature ID. */
export const MAP_EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1770.2!2d153.0377!3d-27.453!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6b9159ed28ef9657%3A0xf5d9bd61cce32c6a!2sPrecision%20Dental!5e0!3m2!1sen!2sau!4v1761177600000!5m2!1sen!2sau'

/** "interest-free" only where DentiCare itself is described (the DentiCare section of Prices and Payment Options). */
export function withoutInterestFree(text: string): string {
  return String(text ?? '')
    .replace(/Interest-Free Payment Plans(?! with DentiCare)/g, 'Payment Plans with DentiCare')
    .replace(/Interest-free payment plans/g, 'Payment plans')
    .replace(/interest-free payment plans/g, 'payment plans')
    .replace(/spread interest-free over time/g, 'spread over time')
    .replace(/No interest, though a deposit/g, 'A deposit')
    .replace(/ with no interest, subject to/g, ', subject to')
}

const sectionKind = (x: Section) => (x as unknown as { kind?: string }).kind

function videoSection(ref: string, token: string, f1: string, f2: string, more?: [string, string]): Omit<Section, 'key'> {
  const fields: Field[] = [
    { id: 'f1', label: 'Heading', type: 'text', value: f1 },
    { id: 'f2', label: 'Paragraph', type: 'text', value: f2 },
  ]
  if (more) fields.push({ id: 'f3', label: 'Link address', type: 'text', value: more[0] }, { id: 'f4', label: 'Link text', type: 'text', value: more[1] })
  return {
    kind: 'content', before: '\n', altAuto: true, alt: false, pinned: false, ref,
    label: `${f1} (videos come from data/videos.json)`,
    template: `<section class="body-section{{alt}} video-section" id="videos"><div class="container reveal"><h2>{{f1}}</h2><div class="prose"><p>{{f2}}</p></div>{{site:${token}}}` +
      (more ? `<p class="video-more"><a class="btn btn-white btn-plain" href="{{f3}}">{{f4}} ${ARR}</a></p>` : '') + `</div></section>`,
    fields,
  } as Omit<Section, 'key'>
}

function fundLogosSection(): Omit<Section, 'key'> {
  return {
    kind: 'content', before: '\n', altAuto: true, alt: false, pinned: false, ref: 'hicaps-logos',
    label: 'Convenient On-the-Spot Claims with HICAPS (fund logos)',
    template: '<section class="body-section{{alt}} fund-logos-section" id="hicaps"><div class="container reveal"><div class="section-head center"><h2>{{f1}}</h2><p>{{f2}}</p></div>{{site:fundLogos}}</div></section>',
    fields: [
      { id: 'f1', label: 'Heading', type: 'text', value: 'Convenient On-the-Spot Claims with HICAPS' },
      { id: 'f2', label: 'Paragraph', type: 'text', value: 'We accept most private health funds and process your claim on the spot with HICAPS, so you only pay the gap on the day.' },
    ],
  } as Omit<Section, 'key'>
}

UPDATES.push({
  id: '2026-10-23-client-round-4',
  description: 'Address as on Google (S13/520 Wickham St), Google listing in the map, HICAPS fund logos, practice videos, interest-free only for DentiCare, price list button',
  apply(c) {
    const done: string[] = []
    const s = c.settings

    // ---- Site Settings
    if (s.address) {
      if (String(s.address.unit || '').trim() === 'S13, HQ South Tower') { s.address.unit = 'S13'; done.push('settings: unit S13 (address S13/520 Wickham St, as on Google)') }
      if (String(s.address.crossStreet || '').trim()) { s.address.crossStreet = ''; done.push('settings: no cross street in the address') }
      if (!String(s.address.mapEmbed || '').includes('/maps/embed?pb=')) { s.address.mapEmbed = MAP_EMBED; done.push('settings: map shows the Google listing') }
    }
    if (s.socials && !String(s.socials.googleBusiness || '').trim()) { s.socials.googleBusiness = GOOGLE_LISTING; done.push('settings: Google Business Profile link') }
    if (s.priceList && s.priceList.buttonLabel === 'Email Me the Price List') { s.priceList.buttonLabel = 'Get Our Full Price List'; done.push('settings: price list button') }

    // ---- "interest-free" only in the DentiCare section of Prices and Payment Options
    const keepDentiCare = (p: Page, x: Section) => p.key === 'price-list' && (x.label || '').startsWith('Interest-Free Payment Plans with DentiCare')
    for (const p of c.pages) {
      let changed = false
      for (const x of p.sections) {
        if (keepDentiCare(p, x)) continue
        for (const f of x.fields || []) {
          const v = withoutInterestFree(f.value)
          if (v !== f.value) { f.value = v; changed = true }
        }
        if (x.template) { const t = withoutInterestFree(x.template); if (t !== x.template) { x.template = t; changed = true } }
        if (x.label) { const l = withoutInterestFree(x.label); if (l !== x.label) x.label = l }
      }
      if (p.seo) {
        for (const k of Object.keys(p.seo) as (keyof typeof p.seo)[]) {
          const v = p.seo[k]
          if (typeof v === 'string') { const n = withoutInterestFree(v); if (n !== v) { (p.seo as unknown as Record<string, string>)[k as string] = n; changed = true } }
        }
      }
      if (changed) { touch4(p); done.push(`${p.key}: payment plans named as DentiCare, without "interest-free"`) }
    }
    for (const b of Object.values(c.blocks || {})) {
      for (const f of b.fields || []) { const v = withoutInterestFree(f.value); if (v !== f.value) { f.value = v; done.push(`block ${b.key}: interest-free`) } }
    }
    for (const p of c.posts || []) {
      const body = withoutInterestFree(p.body); const ex = withoutInterestFree(p.excerpt)
      let changed = body !== p.body || ex !== p.excerpt
      p.body = body; p.excerpt = ex
      for (const q of p.faq || []) {
        const a = q.a.map(withoutInterestFree)
        if (a.some((x, i) => x !== q.a[i])) { q.a = a; changed = true }
      }
      if (changed) done.push(`post ${p.slug}: interest-free`)
    }

    // ---- the map: links to the Google listing under it (shared contact block)
    const contactBlock = c.blocks?.contact
    if (contactBlock && editTemplate(contactBlock as unknown as Section, '<p>{{site:addressLines}}</p>{{site:mapServiceArea}}</div>', '<p>{{site:addressLines}}</p>{{site:mapServiceArea}}{{site:mapLinks}}</div>', '{{site:mapLinks}}')) {
      done.push('contact block: View on Google Maps and Get directions')
    }

    // ---- NAP in page descriptions and the map title: the address exactly as on Google
    for (const p of c.pages) {
      const seo = p.seo as unknown as Record<string, unknown> | undefined
      if (!seo) continue
      for (const k of Object.keys(seo)) {
        const v = seo[k]
        if (typeof v === 'string' && v.includes('HQ South Tower, {{site:street}}, {{site:suburb}}')) {
          seo[k] = v.replace('HQ South Tower, {{site:street}}, {{site:suburb}}', '{{site:address}}')
          touch4(p); done.push(`${p.key}: address in the page description`)
        }
      }
    }
    if (contactBlock && editTemplate(contactBlock as unknown as Section, 'Map showing Precision Dental at {{site:street}}, {{site:suburb}}', 'Map showing Precision Dental at {{site:address}}', 'Precision Dental at {{site:address}}')) {
      done.push('contact block: map title with the full address')
    }

    // ---- HICAPS fund logos: Health Funds (own section) and Prices and Payment Options (compact, under HICAPS)
    const hf = page(c, 'health-funds')
    if (hf && insertSection(hf, fundLogosSection(), (x) => (x.label || '').startsWith('Child Dental Benefits Schedule'))) { touch4(hf); done.push('health-funds: HICAPS fund logos') }
    const prices = page(c, 'price-list')
    const hicaps = prices?.sections.find((x) => (x.label || '').startsWith('Health Fund Claims with HICAPS'))
    if (editTemplate(hicaps, '<div class="prose"><p>{{f2}}</p></div>', '<div class="prose"><p>{{f2}}</p></div>{{site:fundLogosCompact}}', '{{site:fundLogosCompact}}')) { touch4(prices); done.push('price-list: fund logos under HICAPS') }
    if (prices && prices.sections.some((x) => (x.template || '').includes('{{site:priceTeaser}}'))) touch4(prices)

    // ---- practice videos (Vimeo, click to play)
    const add = (key: string, sec: Omit<Section, 'key'>, before: (x: Section) => boolean) => {
      const p = page(c, key)
      if (p && insertSection(p, sec, before)) { touch4(p); done.push(`${key}: ${sec.ref}`) }
    }
    const beforeCta = (x: Section) => sectionKind(x) === 'cta'
    const beforeGallery = (x: Section) => x.ref === 'before-after' || sectionKind(x) === 'faq'
    add('index', videoSection('videos-home', 'videosFeatured', 'Videos from Our Practice',
      'Watch a patient&#x27;s Invisalign journey at Precision Dental, and a short explainer on porcelain veneers.',
      ['/smile-gallery/#videos', 'More Smile Makeover Videos']), beforeCta)
    add('blog', videoSection('videos-blog', 'videosFeatured', 'Videos from Our Practice',
      'Short videos from Precision Dental, from a patient&#x27;s Invisalign journey to how porcelain veneers work.',
      ['/smile-gallery/#videos', 'More Smile Makeover Videos']), beforeCta)
    add('service/invisalign', videoSection('videos-invisalign', 'videosInvisalign', 'Invisalign Smile Makeover Videos',
      'Two of our patients share their Invisalign treatment at Precision Dental.'), beforeGallery)
    add('service/porcelain-veneers', videoSection('videos-veneers', 'videosVeneers', 'Porcelain Veneers Explained',
      'A short video on three common concerns porcelain veneers may help with, and what to discuss at your consultation.'), beforeGallery)
    add('smile-gallery', videoSection('videos-makeovers', 'videosMakeovers', 'Smile Makeover Videos',
      'Patients who agreed to share their smile makeover with us. Every treatment plan is different, so ask us what would suit you.'), beforeCta)
    return done
  },
})
