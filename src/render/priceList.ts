/**
 * The price list (client update, 19 October 2026).
 *
 * data/price-list.json is the one place prices live. It builds:
 *   - the fee table on Prices and Payment Options ({{site:priceTable}})
 *   - the downloadable PDF (scripts/price-list-pdf.ts, run by the build)
 *   - the list of accepted funds on Health Funds ({{site:fundsList}})
 *
 * The New Patient Offer row takes its price and inclusions from Site Settings, so the
 * offer reads the same in the banner, the pop-up, the New Patients page and the table.
 */
import data from '../../data/price-list.json'
import type { Settings } from './types'
import { attr, esc } from './util'
import { inclusionList, offerLive, offerPrice, withLeadDefaults } from './leads'

export interface PriceRow { items: string; service: string; price: string; plan?: boolean; offer?: boolean }
export interface PriceCategory { name: string; rows: PriceRow[] }
export interface PriceData {
  title: string
  edition: string
  pdfFile: string
  /** true: the PDF in public/downloads is a designed one, kept as it is by the build */
  pdfDesigned?: boolean
  disclaimer: string
  planNote: string
  categories: PriceCategory[]
  /** the few fees shown on Prices and Payment Options above the form (v3.4.0) */
  teaser?: { heading: string; rows: { label?: string; find?: string; offer?: boolean }[]; note: string }
  payment: { hicaps: string; methods: string; plans: { name: string; points: string[] }[]; plansNote: string; terms: string }
  funds: { intro: string; heading: string; list: string[]; logos?: { name: string; file: string; preferredMatch?: string }[] }
}

export const PRICE_DATA = data as unknown as PriceData

/** Where the build writes the PDF, as a site path. */
export const PRICE_LIST_PDF = '/downloads/' + PRICE_DATA.pdfFile

/** The PDF every price list form hands out: one uploaded in the dashboard, else the one built from the data file. */
export function priceListFile(s: Settings): string {
  return String(s.priceList?.file || '').trim() || PRICE_LIST_PDF
}

/** {phone} and {preferredFunds} in the data file's sentences. */
export function fillText(text: string, s: Settings): string {
  return String(text || '')
    .replace(/\{phone\}/g, s.phone || '')
    .replace(/\{preferredFunds\}/g, s.preferredFunds || '')
}

/** "Comprehensive examination", "2 intraoral X-rays" ... -> "comprehensive examination, 2 intraoral X-rays and ..." */
export function sentenceList(items: string[]): string {
  const low = items.map((x) => (/^[A-Z][a-z]/.test(x) ? x[0].toLowerCase() + x.slice(1) : x))
  if (low.length < 2) return low.join('')
  return low.slice(0, -1).join(', ') + ' and ' + low[low.length - 1]
}

/** The categories with the offer row filled in from Site Settings (or left out while the offer is off). */
export function priceCategories(settings: Settings): PriceCategory[] {
  const s = withLeadDefaults(settings)
  return PRICE_DATA.categories.map((c) => ({
    name: c.name,
    rows: c.rows.flatMap((r) => {
      if (!r.offer) return [r]
      if (!offerLive(s)) return []
      const period = String(s.offer.period || '').trim()
      return [{
        ...r,
        service: `${s.offer.title || r.service}: ${sentenceList(inclusionList(s))}. New patients only.${period ? ' ' + period : ''}`,
        price: offerPrice(s) || r.price,
      }]
    }),
  })).filter((c) => c.rows.length)
}

// ------------------------------------------------------------------- page
export function priceTable(settings: Settings): string {
  const s = withLeadDefaults(settings)
  const cats = priceCategories(s)
  if (!cats.length) return ''
  const anyPlan = cats.some((c) => c.rows.some((r) => r.plan))
  const body = cats.map((c, i) => {
    const rows = c.rows.map((r) => {
      const offer = r.offer ? ' class="fee-offer"' : ''
      const terms = r.offer && s.offer.termsUrl ? ` <a class="fee-terms" href="${attr(s.offer.termsUrl)}">Offer terms</a>` : ''
      return `<tr${offer}><td class="fee-service" data-label="Treatment">${esc(r.service)}${r.plan ? '<sup aria-label="payment plan available">*</sup>' : ''}</td>` +
        `<td class="fee-items" data-label="ADA item no.">${esc(r.items)}</td>` +
        `<td class="fee-price" data-label="Price">${esc(r.price)}${terms}</td></tr>`
    }).join('')
    return `<tbody><tr class="fee-cat"><th colspan="3" scope="colgroup" id="fees-${i + 1}">${esc(c.name)}</th></tr>${rows}</tbody>`
  }).join('')
  return `<div class="fee-wrap">` +
    `<p class="fee-disclaimer">${esc(fillText(PRICE_DATA.disclaimer, s))}</p>` +
    `<table class="fee-table"><caption class="sr-only">${esc(`Precision Dental fees, ${PRICE_DATA.edition}`)}</caption>` +
    `<thead><tr><th scope="col">Treatment</th><th scope="col">ADA item no.</th><th scope="col">Price</th></tr></thead>${body}</table>` +
    (anyPlan ? `<p class="fee-note"><sup>*</sup> ${esc(PRICE_DATA.planNote).replace('Payment Options', '<a href="#payment-plans">Payment Options</a>')}</p>` : '') +
    `<p class="fee-edition">Fees current as at ${esc(PRICE_DATA.edition)}.</p>` +
    `</div>`
}

/**
 * A few everyday fees above the price list form (client feedback, 21 October 2026): enough to
 * show the fees are reasonable, while the full list stays in the PDF that the form hands out.
 * Prices come from the categories (single source); the offer row from Site Settings.
 */
export function priceTeaser(settings: Settings): string {
  const t = PRICE_DATA.teaser
  if (!t || !t.rows?.length) return ''
  const s = withLeadDefaults(settings)
  const all = PRICE_DATA.categories.flatMap((c) => c.rows)
  const rows = t.rows.flatMap((r) => {
    if (r.offer) {
      if (!offerLive(s)) return []
      const terms = `<a class="pt-terms" href="${attr(s.offer.termsUrl || '/new-patient-offer-terms/')}">${esc(s.offer.termsLine || 'Terms and conditions apply.')}</a>`
      const incl = sentenceList(inclusionList(s))
      return [`<li class="pt-offer"><span class="pt-name"><strong>${esc(s.offer.title || 'New Patient Offer')}</strong>` +
        `<span class="pt-incl">${esc(incl[0].toUpperCase() + incl.slice(1))}.</span>${terms}</span>` +
        `<span class="pt-price">${esc(offerPrice(s))}</span></li>`]
    }
    const row = all.find((x) => !x.offer && x.service.startsWith(r.find || '\u0000'))
    if (!row) throw new Error(`price teaser: no fee in data/price-list.json starts with "${r.find}"`)
    return [`<li><span class="pt-name">${esc(r.label || row.service)}</span><span class="pt-price">${esc(row.price)}</span></li>`]
  })
  if (!rows.length) return ''
  return `<div class="price-teaser${rows.length === 1 ? ' price-teaser-single' : ''}">${t.heading ? `<h3>${esc(t.heading)}</h3>` : ''}<ul>${rows.join('')}</ul>` +
    (t.note ? `<p class="pt-note">${esc(fillText(t.note, s))}</p>` : '') + `</div>`
}

/**
 * The HICAPS health fund logo grid (client request, 23 October 2026). Funds named in Site
 * Settings > Preferred funds get a "Preferred Provider" badge. `compact` is the smaller
 * version under HICAPS on Prices and Payment Options.
 */
export function fundLogos(settings: Settings, compact: boolean): string {
  const logos = (PRICE_DATA.funds.logos || []).filter((l) => l.name && l.file)
  if (!logos.length) return ''
  const preferred = String(settings.preferredFunds || '').toLowerCase()
  const items = logos.map((l) => {
    const pref = !!l.preferredMatch && preferred.includes(l.preferredMatch.toLowerCase())
    return `<li class="fund-logo${pref ? ' is-preferred' : ''}">` +
      `<img src="${attr(l.file)}" alt="${attr(l.name)}" loading="lazy" decoding="async">` +
      (pref ? '<span class="fund-badge">Preferred Provider</span>' : '') + `</li>`
  }).join('')
  return `<ul class="fund-logos${compact ? ' fund-logos-compact' : ''}" aria-label="Health funds we claim on the spot with HICAPS">${items}</ul>`
}

export function fundsList(settings: Settings): string {
  const list = PRICE_DATA.funds.list.filter(Boolean)
  if (!list.length) return ''
  return `<ul class="fund-grid">${list.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`
}

export function fundsIntro(settings: Settings): string {
  return esc(fillText(PRICE_DATA.funds.intro, withLeadDefaults(settings)))
}
