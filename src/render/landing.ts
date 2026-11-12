/**
 * Pieces for the Google Ads landing pages (/lp/..., 12 November 2026). Each one reads Site
 * Settings, so the offer, the review numbers and the health funds stay in one place and
 * update on these pages and the rest of the site together.
 */
import type { Settings } from './types'
import { attr, esc } from './util'
import { inclusionList, offerLive, offerPrice, reviewsUrl, OFFER_TERMS_URL, DEFAULTS } from './leads'
import { PRICE_DATA } from './priceList'

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
const ARR = '<span class="arr"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>'
const TAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>'

/** "New Patient Offer $229" pill at the top of the hero, linking down to the offer card. */
export function offerPill(s: Settings): string {
  if (!offerLive(s)) return ''
  return `<a class="lp-offer-pill" href="#offer-card">${TAG}<span>${esc(s.offer.title || 'New Patient Offer')}</span><b>${esc(offerPrice(s))}</b></a>`
}

/** The offer card beside the hero photo: price, inclusions, terms and a booking button. */
export function offerCard(s: Settings): string {
  if (!offerLive(s)) return ''
  const book = s.offer.bookLabel || DEFAULTS.offer.bookLabel
  const terms = `<a href="${attr(s.offer.termsUrl || OFFER_TERMS_URL)}">${esc(s.offer.termsLine || DEFAULTS.offer.termsLine)}</a>` +
    (s.offer.period ? ` <span class="offer-period">${esc(s.offer.period)}</span>` : '')
  return `<div class="lp-offer" id="offer-card">` +
    `<div class="lp-offer-top"><span class="lp-offer-title">${esc(s.offer.title || 'New Patient Offer')}</span>` +
    `<span class="lp-offer-price"><b>${esc(offerPrice(s))}</b><small>new patients</small></span></div>` +
    `<p class="lp-offer-lead">Your first visit includes:</p>` +
    `<ul class="lp-offer-list">${inclusionList(s).map((i) => `<li>${CHECK}<span>${esc(i)}</span></li>`).join('')}</ul>` +
    `<a class="btn btn-blue lp-offer-btn" href="${attr(s.bookingUrl)}" target="_blank" rel="noopener" data-track="book" data-offer-cta="landing-card">${esc(book)} ${ARR}</a>` +
    `<p class="lp-offer-terms">${terms}</p></div>`
}

/** Google stars, rating and review count for the hero: numbers only, never review wording. */
export function reviewsScore(s: Settings): string {
  const r = s.reviews
  const raw = String(r.count || '').trim()
  if (!r.enabled || !raw) return ''
  const num = /^\d[\d,]*\+?$/.test(raw) ? raw.replace(/\+$/, '') : ''
  const rating = Number(String(r.rating || '').replace(',', '.'))
  const hasRating = rating > 0 && rating <= 5
  const shown = hasRating ? rating.toFixed(1) : ''
  const label = `${num ? `Over ${num}` : raw} Google reviews${hasRating ? `, rated ${shown} out of 5` : ''}. See our reviews on Google (opens in a new tab).`
  return `<a class="lp-score" href="${attr(reviewsUrl(s))}" target="_blank" rel="noopener"><span class="sr-only">${esc(label)}</span>` +
    `<span class="lp-g" aria-hidden="true">Google</span>` +
    (hasRating ? `<span class="lp-rating" aria-hidden="true"><b>${shown}</b><span class="gr-stars" style="--rating:${shown}"></span></span>` : '') +
    `<span class="lp-count" aria-hidden="true">${num ? `Over ${esc(num)}` : esc(raw)} Google reviews</span></a>`
}

function preferredSet(s: Settings) {
  const preferred = String(s.preferredFunds || '').toLowerCase()
  const logos = (PRICE_DATA.funds.logos || []).filter((l) => l.name && l.file)
  return logos.map((l) => ({ ...l, pref: !!l.preferredMatch && preferred.includes(l.preferredMatch.toLowerCase()) }))
}

/** The preferred provider funds (Site Settings, Preferred funds), large. */
export function fundsPreferredLogos(s: Settings): string {
  const items = preferredSet(s).filter((l) => l.pref)
  if (!items.length) return ''
  return `<ul class="lp-pref-logos" aria-label="Preferred provider health funds">${items.map((l) =>
    `<li><span class="lp-pref-badge">Preferred Provider</span><img src="${attr(l.file)}" alt="${attr(l.name)}" loading="lazy" decoding="async"></li>`).join('')}</ul>`
}

/** Every other fund we claim on the spot with HICAPS, smaller. */
export function fundsOtherLogos(s: Settings): string {
  const items = preferredSet(s).filter((l) => !l.pref)
  if (!items.length) return ''
  return `<ul class="lp-fund-logos" aria-label="Other health funds we claim on the spot with HICAPS">${items.map((l) =>
    `<li><img src="${attr(l.file)}" alt="${attr(l.name)}" loading="lazy" decoding="async"></li>`).join('')}</ul>`
}
