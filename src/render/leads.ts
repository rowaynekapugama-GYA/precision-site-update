/**
 * The 14 October 2026 revisions: the new patient offer (homepage banner, landing
 * page panel, pop-up, terms), the Google reviews badge, the gated price list form,
 * practitioner registration lines, the health fund and scheme lines that wait for
 * the practice to confirm them, and the before and after gallery.
 *
 * Everything here is built from Site Settings, Team and the Before & After list,
 * so each fact (price, inclusions, terms link, rating, registration number) is
 * changed in one place. Anything switched off renders as nothing at all.
 */
import type { BeforeAfterCase, Settings, TeamMember } from './types'
import { attr, esc } from './util'
import { phoneDigits } from './settings'

// ------------------------------------------------------------------ icons
export const ICON_PILL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/></svg>'
const ICON_ARR = '<span class="arr"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>'
const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
const ICON_CHEV_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'

// --------------------------------------------------------------- defaults
export const OFFER_TERMS_URL = '/new-patient-offer-terms/'

export const DEFAULTS = {
  offer: {
    enabled: false,
    showBanner: true,
    showPopup: true,
    popupDelay: 2,
    title: 'New Patient Offer',
    price: '',
    inclusions: '',
    period: '',
    termsLine: 'New patients only. Terms and conditions apply.',
    termsUrl: OFFER_TERMS_URL,
    terms: '',
    bookLabel: 'Book Now',
  },
  reviews: { enabled: false, rating: '', count: '', url: '', logo: '' },
  priceList: {
    file: '',
    delivery: 'smileox' as const,
    buttonLabel: 'Email Me the Price List',
    consentText: 'I agree to Precision Dental emailing me the price list and contacting me about my enquiry. I can opt out at any time.',
    thankYou: 'Thank you. Our price list is on its way to your inbox. If it has not arrived within a few minutes, please check your junk folder or give us a call.',
  },
  schemes: { hicaps: false, cdbsBulkBill: false, dvaDirectBill: false },
}

/** Settings written before these revisions (or saved without them) get the defaults. */
export function withLeadDefaults(s: Settings): Settings {
  const o = (s as Partial<Settings>).offer
  const r = (s as Partial<Settings>).reviews
  const p = (s as Partial<Settings>).priceList
  const sc = (s as Partial<Settings>).schemes
  const t = s.tracking || ({} as Settings['tracking'])
  return {
    ...s,
    tracking: { ga4Id: t.ga4Id ?? '', gtmId: t.gtmId ?? '', metaPixelId: t.metaPixelId ?? '', googleAdsId: t.googleAdsId ?? '', adsPriceListLabel: t.adsPriceListLabel ?? '' },
    offer: { ...DEFAULTS.offer, ...(o || {}) },
    reviews: { ...DEFAULTS.reviews, ...(r || {}) },
    priceList: { ...DEFAULTS.priceList, ...(p || {}) },
    schemes: { ...DEFAULTS.schemes, ...(sc || {}) },
  }
}

// ----------------------------------------------------------------- offer
export function inclusionList(s: Settings): string[] {
  return String(s.offer.inclusions || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
}

/** "229" or "$229" -> "$229". Blank when there is no price, which also switches the offer off. */
export function offerPrice(s: Settings): string {
  const p = String(s.offer.price || '').trim().replace(/^\$/, '')
  return p ? `$${p}` : ''
}

export function offerLive(s: Settings): boolean {
  return !!s.offer.enabled && !!offerPrice(s) && inclusionList(s).length > 0
}

function termsLink(s: Settings, cls: string): string {
  const line = s.offer.termsLine || DEFAULTS.offer.termsLine
  const period = s.offer.period ? ` <span class="offer-period">${esc(s.offer.period)}</span>` : ''
  return `<p class="${cls}"><a href="${attr(s.offer.termsUrl || OFFER_TERMS_URL)}">${esc(line)}</a>${period}</p>`
}

function offerButtons(s: Settings, placement: string, bookClass = 'btn btn-blue'): string {
  const book = s.offer.bookLabel || DEFAULTS.offer.bookLabel
  return `<div class="btn-group">` +
    `<a class="${bookClass}" href="${attr(s.bookingUrl)}" target="_blank" rel="noopener" data-track="book" data-offer-cta="${placement}">${esc(book)} ${ICON_ARR}</a>` +
    `<a class="btn btn-white btn-plain" href="tel:${esc(phoneDigits(s.phone))}" data-track="call" data-offer-cta="${placement}">Call ${esc(s.phone)}</a>` +
    `</div>`
}

function checkList(items: string[], cls: string): string {
  return `<ul class="${cls}">${items.map((i) => `<li>${ICON_CHECK}<span>${esc(i)}</span></li>`).join('')}</ul>`
}

/** The strip directly under the homepage hero. */
export function offerBanner(s: Settings): string {
  if (!offerLive(s) || !s.offer.showBanner) return ''
  return `<section class="offer-strip" id="new-patient-offer" aria-label="${esc(s.offer.title)}">` +
    `<div class="container offer-strip-inner reveal">` +
    `<div class="os-price"><span class="os-title">${esc(s.offer.title)}</span><b>${esc(offerPrice(s))}</b></div>` +
    `<div class="os-body">${checkList(inclusionList(s), 'os-list')}${termsLink(s, 'os-terms')}</div>` +
    `<div class="os-cta">${offerButtons(s, 'home-banner')}</div>` +
    `</div></section>`
}

/** The main call to action on the New Patients page. */
export function offerSection(s: Settings): string {
  if (!offerLive(s)) return ''
  return `<section class="offer-feature" id="offer"><div class="container">` +
    `<div class="offer-panel reveal">` +
    `<div class="op-main"><span class="pill">${ICON_PILL}${esc(s.offer.title)}</span>` +
    `<h2><span class="op-amount">${esc(offerPrice(s))}</span> for your first visit</h2>` +
    `<p class="op-lead">Your new patient appointment includes:</p>` +
    `${checkList(inclusionList(s), 'check-list op-list')}</div>` +
    `<div class="op-side">${offerButtons(s, 'new-patients', 'btn btn-dark')}${termsLink(s, 'op-terms')}</div>` +
    `</div></div></section>`
}

export const OFFER_PHOTO = '/assets/img/offer-team.webp'
const ICON_PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>'
const WAVE = '<svg class="om-wave" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">' +
  '<path d="M0 70 C 260 10, 470 120, 760 64 S 1080 20, 1200 46 V120 H0 Z" fill="#DCEFFA"/>' +
  '<path d="M0 96 C 300 50, 520 128, 820 86 S 1100 62, 1200 78 V120 H0 Z" fill="#1A9AD4"/>' +
  '<path d="M0 112 C 320 84, 560 132, 860 104 S 1110 94, 1200 102 V120 H0 Z" fill="#012A41"/></svg>'

/** "New Patient Offer" -> New Patient / <em>Offer</em>, the last word in the serif accent the site uses. */
function splitTitle(title: string): string {
  const words = String(title || '').trim().split(/\s+/)
  if (words.length < 2) return esc(title)
  const last = words.pop() as string
  return `${esc(words.join(' '))} <span>${esc(last)}</span>`
}

/**
 * The centred pop-up: shown once per visit, a moment after the first page opens.
 * Closes with the X, the Esc key or a click outside it, and gives focus back to the
 * page. Hidden in the HTML (and never shown without JavaScript) until leads.js opens it.
 */
export function offerPopup(s: Settings): string {
  if (!offerLive(s) || !s.offer.showPopup) return ''
  const delay = Math.max(0, Math.round(Number(s.offer.popupDelay) || 0))
  const skip = ['/new-patients/', s.offer.termsUrl || OFFER_TERMS_URL].join(' ')
  const book = s.offer.bookLabel || DEFAULTS.offer.bookLabel
  return `\n<div class="offer-modal" id="offerPop" hidden data-delay="${delay}" data-skip="${attr(skip)}">` +
    `<div class="om-backdrop" data-pop-close></div>` +
    `<div class="om-dialog" role="dialog" aria-modal="true" aria-labelledby="offerPopTitle" aria-describedby="offerPopInc" tabindex="-1">` +
    `<button class="om-x" type="button" aria-label="Close this offer" data-pop-close>${ICON_X}</button>` +
    `<div class="om-main">` +
    `<img class="om-logo" src="${attr(s.logo)}" alt="${esc(s.practiceName)}" width="113" height="52">` +
    `<h2 class="om-title" id="offerPopTitle">${splitTitle(s.offer.title)}</h2>` +
    `<p class="om-inc-label">Includes</p>` +
    `<ul class="om-list" id="offerPopInc">${inclusionList(s).map((i) => `<li>${ICON_CHECK}<span>${esc(i)}</span></li>`).join('')}</ul>` +
    `<div class="om-cta">` +
    `<a class="btn btn-blue" href="${attr(s.bookingUrl)}" target="_blank" rel="noopener" data-track="book" data-offer-cta="popup">${esc(book)} ${ICON_ARR}</a>` +
    `<a class="btn btn-white btn-plain" href="tel:${esc(phoneDigits(s.phone))}" data-track="call" data-offer-cta="popup">${ICON_PHONE}${esc(s.phone)}</a>` +
    `</div>` +
    termsLink(s, 'om-terms') +
    `</div>` +
    `<div class="om-visual" aria-hidden="true"><div class="om-ring"><img src="${OFFER_PHOTO}" alt="" width="720" height="720" loading="lazy"></div>` +
    `<div class="om-price"><b>${esc(offerPrice(s))}</b><span>New patients</span></div></div>` +
    WAVE +
    `</div></div>`
}

/** The facts of the offer on the terms page, then the full terms from Site Settings. */
export function offerTerms(s: Settings): string {
  const price = offerPrice(s)
  const rows: [string, string][] = [
    ['Offer', `${s.offer.title}${price ? `: ${price}` : ''}`],
    ['Includes', inclusionList(s).join(', ')],
    ['Who it is for', 'New patients of Precision Dental'],
    ['Offer period', s.offer.period || 'Ongoing'],
  ]
  const facts = `<dl class="terms-facts">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`
  const body = String(s.offer.terms || '').trim()
  const text = body
    ? body.split(/\n\s*\n/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('\n')
    : ''
  return facts + '\n' + text
}

// ---------------------------------------------------------- reviews badge
/** The hero badge was replaced by the reviews band (15 October); the slot in the hero stays empty. */
export function reviewsBadge(_s: Settings): string {
  return ''
}

/** Where the band links: the profile link in Site Settings, else the footer icon's, else a Maps search for the practice. */
export function reviewsUrl(s: Settings): string {
  const own = String(s.reviews.url || '').trim() || String(s.socials.googleBusiness || '').trim()
  if (/^https?:\/\//i.test(own)) return own
  const a = s.address
  const q = `${s.practiceName}, ${a.street}, ${a.suburb} ${a.state} ${a.postcode}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

export const REVIEWS_BG = '/assets/img/reception-desk.webp'

/**
 * "Over 500 Google Reviews" band under the homepage offer strip, linked to the Google
 * Business Profile. The number of reviews only, and the star rating when it has been
 * entered: never any review wording (AHPRA treats patient reviews as testimonials).
 */
export function reviewsBand(s: Settings): string {
  const r = s.reviews
  const raw = String(r.count || '').trim()
  if (!r.enabled || !raw) return ''
  const num = /^\d[\d,]*\+?$/.test(raw) ? raw.replace(/\+$/, '') : ''
  const rating = Number(String(r.rating || '').replace(',', '.'))
  const hasRating = rating > 0 && rating <= 5
  const shown = hasRating ? rating.toFixed(1) : ''
  // screen readers get one clear sentence; the words on screen are unchanged (pre-launch audit, 27 October 2026)
  const label = `${num ? `Over ${num}` : raw} Google reviews${hasRating ? `, rated ${shown} out of 5` : ''}. See our reviews on Google (opens in a new tab).`
  const brand = r.logo
    ? `<img class="gr-logo" src="${attr(r.logo)}" alt="Google" width="240" height="80">`
    : `<span class="gr-word">Google</span>`
  const stars = hasRating
    ? `<span class="gr-stars" style="--rating:${shown}" aria-hidden="true"></span><span class="gr-rating">${shown}</span>`
    : ''
  return `<section class="gr-band" id="google-reviews" aria-label="Google reviews">` +
    `<div class="gr-bg" aria-hidden="true"><img src="${REVIEWS_BG}" alt="" width="1400" height="933" loading="lazy"></div>` +
    `<div class="container"><a class="gr-link reveal" href="${attr(reviewsUrl(s))}" target="_blank" rel="noopener"><span class="sr-only">${esc(label)}</span>` +
    `<span class="gr-count" aria-hidden="true">${num ? `<small>Over</small><b>${esc(num)}</b>` : `<b class="gr-count-text">${esc(raw)}</b>`}</span>` +
    `<span class="gr-brand" aria-hidden="true">${brand}<span class="gr-sub">Reviews ${stars}</span></span>` +
    `<span class="gr-cta" aria-hidden="true">See our reviews on Google <span class="arr" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></span>` +
    `</a></div></section>`
}

// ------------------------------------------------------------ price list
export function priceListForm(s: Settings): string {
  const p = s.priceList
  const t = s.tracking
  const sendTo = t.googleAdsId && t.adsPriceListLabel && /^AW-\d+$/.test(t.googleAdsId.trim()) && /^[\w-]+$/.test(t.adsPriceListLabel.trim())
    ? ` data-ads-send-to="${t.googleAdsId.trim()}/${t.adsPriceListLabel.trim()}"` : ''
  return `<form class="form-grid pl-form" action="/api/price-list" method="post" novalidate data-pl-form${sendTo}>` +
    `<div class="field"><label for="pl-first">First name</label><input id="pl-first" name="firstName" type="text" autocomplete="given-name" required maxlength="80"></div>` +
    `<div class="field"><label for="pl-last">Last name</label><input id="pl-last" name="lastName" type="text" autocomplete="family-name" required maxlength="80"></div>` +
    `<div class="field full"><label for="pl-email">Email</label><input id="pl-email" name="email" type="email" autocomplete="email" required maxlength="160"></div>` +
    `<div class="field full"><label for="pl-mobile">Mobile</label><input id="pl-mobile" name="mobile" type="tel" autocomplete="tel" inputmode="tel" required maxlength="20"></div>` +
    `<div class="pl-hp" aria-hidden="true"><label for="pl-company">Company</label><input id="pl-company" name="company" type="text" tabindex="-1" autocomplete="off"></div>` +
    `<label class="consent full"><input type="checkbox" name="consent" value="yes" required> <span>${esc(p.consentText || DEFAULTS.priceList.consentText)} Read our <a href="/privacy-policy/">Privacy Statement</a>.</span></label>` +
    `<p class="form-status" role="status" aria-live="polite" data-pl-status></p>` +
    // once the details are in, the visitor can open the PDF straight away as well. The page never
    // carries the PDF's address: /api/price-list returns it only after a valid request (20 Oct 2026)
    `<div class="pl-thanks" hidden data-pl-thanks><p>${esc(p.thankYou || DEFAULTS.priceList.thankYou)}</p>` +
    `<a class="btn btn-blue pl-pdf" href="/price-list/" hidden target="_blank" rel="noopener" data-pl-pdf>Open the price list (PDF) ${ICON_ARR}</a></div>` +
    `<div class="full"><button class="btn btn-dark" type="submit" data-pl-submit>${esc(p.buttonLabel || DEFAULTS.priceList.buttonLabel)} ${ICON_ARR}</button></div>` +
    `</form>`
}

// ------------------------------------------------- health fund and scheme lines
/** Lines the practice must confirm before they appear. Each is empty until switched on. */
export function schemeLines(s: Settings): Record<string, string> {
  return {
    hicapsLine: s.schemes.hicaps
      ? '<p>We accept most private health insurance benefits using HICAPS, so you can claim on the spot and pay only the gap. No manual lodgement needed.</p>' : '',
    cdbsBulkBillLine: s.schemes.cdbsBulkBill
      ? '<p>We bulk bill eligible CDBS services, so there is no out-of-pocket cost for treatment covered by the schedule, up to your child&#x27;s benefit cap.</p>' : '',
    dvaBillingLine: s.schemes.dvaDirectBill
      ? '<p>We bill DVA directly for eligible treatment, so there is nothing for you to claim yourself.</p>' : '',
  }
}

// -------------------------------------------------- practitioner registration
export function registrationText(m: TeamMember): string {
  const num = String(m.registrationNumber || '').trim()
  if (!num) return ''
  const type = String(m.registrationType || '').trim()
  return `${m.name}, ${type ? `${type}, ` : ''}AHPRA Registration: ${num}`
}

/** {{site:regDrBillyChoi}} for each registered practitioner, and the footer lines. */
export function registrationTokens(team: TeamMember[]): Record<string, string> {
  const people = [...team].filter((m) => !m.hidden && registrationText(m)).sort((a, b) => a.order - b.order)
  const out: Record<string, string> = {
    registrations: people.length
      ? `\n        <p class="foot-reg">${people.map((m) => esc(registrationText(m))).join('<br>')}</p>` : '',
  }
  for (const m of people) out[regTokenName(m.name)] = esc(registrationText(m))
  return out
}

export function regTokenName(name: string): string {
  return 'reg' + String(name || '').split(/[^A-Za-z]+/).filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('')
}

// ---------------------------------------------------------- before and after
/** A case only reaches the website with consent documented, unedited photos and like-for-like lighting. */
export function caseReady(c: BeforeAfterCase): boolean {
  return !!(c.published && c.consentDocumented && c.unedited && c.consistentLighting && c.before && c.after)
}

export function casesFor(cases: BeforeAfterCase[], pageKey: string): BeforeAfterCase[] {
  return cases.filter((c) => c.page === pageKey && caseReady(c)).sort((a, b) => a.order - b.order)
}

export const BA_DISCLAIMER = 'Any invasive procedure carries risks. Results vary between individuals. Seek a second opinion from an appropriately qualified health practitioner before proceeding.'

export function beforeAfterCards(cases: BeforeAfterCase[]): string {
  return cases.map((c) =>
    `<figure class="ba-case"><div class="ba-pair">` +
    `<div class="ba-img"><img src="${attr(c.before)}" alt="${esc(c.beforeAlt || `${c.title}, before treatment`)}" loading="lazy" width="800" height="600"><span class="ba-tag">Before</span></div>` +
    `<div class="ba-img"><img src="${attr(c.after)}" alt="${esc(c.afterAlt || `${c.title}, after treatment`)}" loading="lazy" width="800" height="600"><span class="ba-tag">After</span></div>` +
    `</div><figcaption><strong>${esc(c.title)}</strong>${c.caption ? `<span>${esc(c.caption)}</span>` : ''}</figcaption></figure>`,
  ).join('')
}

export const ICONS = { chevDown: ICON_CHEV_DOWN }
