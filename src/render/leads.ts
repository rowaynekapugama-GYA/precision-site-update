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
    popupDelay: 20,
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

/** The small, dismissible pop-up. Hidden until leads.js shows it (once per visit). */
export function offerPopup(s: Settings): string {
  if (!offerLive(s) || !s.offer.showPopup) return ''
  const delay = Math.max(0, Math.round(Number(s.offer.popupDelay) || 0))
  const skip = ['/new-patients/', s.offer.termsUrl || OFFER_TERMS_URL].join(' ')
  return `\n<aside class="offer-pop" id="offerPop" hidden role="dialog" aria-modal="false" aria-labelledby="offerPopTitle" data-delay="${delay}" data-skip="${attr(skip)}">` +
    `<button class="offer-pop-x" type="button" aria-label="Close this offer" data-pop-close>${ICON_X}</button>` +
    `<span class="offer-pop-tag">${esc(s.offer.title)}</span>` +
    `<p class="offer-pop-price" id="offerPopTitle"><b>${esc(offerPrice(s))}</b> <span>${esc(s.offer.title)}</span></p>` +
    `<p class="offer-pop-inc">${inclusionList(s).map(esc).join(' <span aria-hidden="true">&middot;</span> ')}</p>` +
    offerButtons(s, 'popup') +
    termsLink(s, 'offer-pop-terms') +
    `</aside>`
}

/** The facts of the offer on the terms page, then the full terms (or a clear placeholder). */
export function offerTerms(s: Settings): string {
  const price = offerPrice(s)
  const rows: [string, string][] = [
    ['Offer', `${s.offer.title}${price ? `: ${price}` : ''}`],
    ['Includes', inclusionList(s).join(', ')],
    ['Who it is for', 'New patients of Precision Dental'],
    ['Offer period', s.offer.period || 'To be confirmed by Precision Dental'],
  ]
  const facts = `<dl class="terms-facts">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`
  const body = String(s.offer.terms || '').trim()
  const text = body
    ? body.split(/\n\s*\n/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('\n')
    : `<div class="placeholder-note"><strong>Placeholder.</strong> The full terms and conditions of this offer are being confirmed by Precision Dental and will appear here.</div>`
  return facts + '\n' + text
}

// ---------------------------------------------------------- reviews badge
export function reviewsBadge(s: Settings): string {
  const r = s.reviews
  const rating = Number(String(r.rating || '').replace(',', '.'))
  if (!r.enabled || !r.url || !(rating > 0 && rating <= 5)) return ''
  const shown = rating.toFixed(1)
  const count = String(r.count || '').trim()
  const label = `Rated ${shown} out of 5${count ? ` from ${count} Google reviews` : ' on Google'}. Opens our Google Business Profile.`
  const logo = r.logo ? `<img class="rb-logo" src="${attr(r.logo)}" alt="" width="22" height="22">` : ''
  // a rating badge only, never review text, and off until the practice signs it off
  return `<a class="reviews-badge" href="${attr(r.url)}" target="_blank" rel="noopener" aria-label="${esc(label)}">` + // qa:allow
    logo +
    `<span class="rb-stars" style="--rating:${shown}" aria-hidden="true"></span>` +
    `<span class="rb-txt"><b>${shown}</b> ${esc(count ? `${count} Google Reviews` : 'Google Reviews')}</span></a>`
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
    `<p class="pl-thanks" hidden data-pl-thanks>${esc(p.thankYou || DEFAULTS.priceList.thankYou)}</p>` +
    `<div class="full"><button class="btn btn-dark" type="submit" data-pl-submit>${esc(p.buttonLabel || DEFAULTS.priceList.buttonLabel)} ${ICON_ARR}</button></div>` +
    `</form>`
}

// ------------------------------------------------- health fund and scheme lines
/** Lines the practice must confirm before they appear. Each is empty until switched on. */
export function schemeLines(s: Settings): Record<string, string> {
  return {
    hicapsLine: s.schemes.hicaps
      ? '<p>Claims can be processed on the spot with HICAPS, so you only pay any gap on the day.</p>' : '',
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
