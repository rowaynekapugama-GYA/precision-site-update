/**
 * Site Settings as the values the pages need.
 *
 * The practice phone, email, address, hours, booking link, socials and preferred
 * health funds appear in about 1,900 places across the site. In the content model
 * they are {{site:...}} placeholders, filled from here at build time, so each one
 * is changed in exactly one place.
 */
import type { HoursDay, Settings } from './types'
import { attr, esc, ORIGIN } from './util'
import { fundsList, priceTable } from './priceList'
import { offerBanner, offerPopup, offerSection, offerTerms, priceListForm, reviewsBadge, reviewsBand, schemeLines, withLeadDefaults } from './leads'

const SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri',
  Saturday: 'Sat', Sunday: 'Sun',
}

/** 09:00 -> 9am, 18:00 -> 6pm, 09:30 -> 9.30am */
export function clock(t: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim())
  if (!m) return String(t || '')
  let h = parseInt(m[1], 10)
  const min = m[2]
  const ampm = h >= 12 ? 'pm' : 'am'
  h = h % 12
  if (h === 0) h = 12
  return `${h}${min === '00' ? '' : '.' + min}${ampm}`
}

function joinDays(days: string[], short: boolean): string {
  const names = days.map((d) => (short ? SHORT[d] ?? d : d))
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names[0]} to ${names[names.length - 1]}`
}

/** Runs of consecutive closed days, and each open day on its own. */
function rows(hours: HoursDay[]): { days: string[]; open: boolean; text: string }[] {
  const out: { days: string[]; open: boolean; text: string }[] = []
  for (const h of hours) {
    if (h.open) {
      out.push({ days: [h.day], open: true, text: `${clock(h.opens)} to ${clock(h.closes)}` })
    } else {
      const last = out[out.length - 1]
      if (last && !last.open) last.days.push(h.day)
      else out.push({ days: [h.day], open: false, text: 'Closed' })
    }
  }
  return out
}

/** Open days grouped by identical hours, in order of first appearance. */
export function hourGroups(hours: HoursDay[]): { days: string[]; opens: string; closes: string }[] {
  const groups: { days: string[]; opens: string; closes: string }[] = []
  for (const h of hours) {
    if (!h.open) continue
    const g = groups.find((x) => x.opens === h.opens && x.closes === h.closes)
    if (g) g.days.push(h.day)
    else groups.push({ days: [h.day], opens: h.opens, closes: h.closes })
  }
  return groups
}

export function hoursRows(hours: HoursDay[]): string {
  return rows(hours)
    .map((r) => `<li><span>${esc(joinDays(r.days, true))}</span><span>${esc(r.text)}</span></li>`)
    .join('\n          ')
}

export function hoursList(hours: HoursDay[]): string {
  return rows(hours)
    .map((r) => `<p>${esc(joinDays(r.days, false))}: ${esc(r.text)}</p>`)
    .join('\n')
}

export function hoursSummary(hours: HoursDay[]): string {
  return hourGroups(hours)
    .map((g) => `${g.days.map((d) => SHORT[d] ?? d).join(', ')} ${clock(g.opens)} to ${clock(g.closes)}.`)
    .join(' ')
}

/** (07) 3852 1160 -> 0738521160 */
export function phoneDigits(phone: string): string {
  return String(phone || '').replace(/[^\d+]/g, '')
}

/** (07) 3852 1160 -> +61 7 3852 1160, 0412 345 678 -> +61 412 345 678 */
export function phoneIntl(phone: string): string {
  const d = String(phone || '').replace(/\D/g, '')
  if (/^0[2378]\d{8}$/.test(d)) return `+61 ${d[1]} ${d.slice(2, 6)} ${d.slice(6)}`
  if (/^04\d{8}$/.test(d)) return `+61 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
  if (/^1[38]00\d{6}$/.test(d)) return `+61 ${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
  return phone
}

/** The value each {{site:...}} placeholder becomes, already safe for HTML. */
export function siteTokens(settings: Settings): Record<string, string> {
  const s = withLeadDefaults(settings)
  const a = s.address
  const social = (u: string) => (u && u.trim() ? attr(u.trim()) : '#')
  // the street as people read it: "520 Wickham St (Corner of Brookes St)"; the schema keeps the plain street
  const streetFull = streetWithCross(s)
  const area = String(s.serviceAreaLine || '').trim()
  return {
    phone: esc(s.phone),
    phoneTel: esc(phoneDigits(s.phone)),
    email: esc(s.email),
    address: esc(`${a.unit}, ${streetFull}, ${a.suburb} ${a.state} ${a.postcode}`),
    addressLines: `${esc(a.unit)}<br>${esc(streetFull)}<br>${esc(`${a.suburb} ${a.state} ${a.postcode}`)}`,
    addressShort: esc(`${a.unit}, ${a.suburb} ${a.state} ${a.postcode}`),
    addressStreet: esc(`${a.unit}, ${streetFull}`),
    serviceAreaLine: esc(area),
    footServiceArea: area ? `<p class="foot-area">${esc(area)}</p>` : '',
    mapServiceArea: area ? `<p class="map-area">${esc(area)}</p>` : '',
    streetShort: esc(a.streetShort),
    street: esc(a.street),
    suburb: esc(a.suburb),
    abn: esc(s.abn),
    booking: attr(s.bookingUrl),
    mapEmbed: attr(a.mapEmbed),
    preferredFunds: esc(s.preferredFunds),
    parking: esc(s.parking),
    logo: attr(s.logo),
    hoursRows: hoursRows(s.hours),
    hoursList: hoursList(s.hours),
    hoursSummary: esc(hoursSummary(s.hours)),
    facebook: social(s.socials.facebook),
    instagram: social(s.socials.instagram),
    youtube: social(s.socials.youtube),
    linkedin: social(s.socials.linkedin),
    googleBusiness: social(s.socials.googleBusiness),
    headExtra: headExtra(s),
    bodyStart: bodyStart(s),
    offerBanner: offerBanner(s),
    offerSection: offerSection(s),
    offerPopup: offerPopup(s),
    offerTerms: offerTerms(s),
    reviewsBadge: reviewsBadge(s),
    reviewsBand: reviewsBand(s),
    priceListForm: priceListForm(s),
    priceTable: priceTable(s),
    fundsList: fundsList(s),
    ...schemeLines(s),
  }
}

/** "520 Wickham St (Corner of Brookes St)", or just the street when there is no cross street. */
export function streetWithCross(s: Settings): string {
  const cross = String(s.address.crossStreet || '').trim()
  return cross ? `${s.address.street} (${cross})` : s.address.street
}

/** The schema's areaServed, from the comma-separated list in Site Settings. */
export function areaServed(s: Settings): Record<string, string>[] {
  return String(s.areaServed || '').split(',').map((x) => x.trim()).filter(Boolean)
    .map((name) => ({ '@type': 'Place', name }))
}

const ID_RE = /^[A-Za-z0-9-]+$/

/** Brand colour overrides and tracking tags, injected only when set. */
function headExtra(s: Settings): string {
  const out: string[] = []
  const vars: string[] = []
  const hex = (v: string) => /^#[0-9a-fA-F]{3,8}$/.test(String(v || '').trim())
  if (hex(s.colours.navy)) vars.push(`--navy:${s.colours.navy.trim()}`)
  if (hex(s.colours.blue)) vars.push(`--blue-500:${s.colours.blue.trim()}`, `--blue-600:${s.colours.blue.trim()}`)
  if (hex(s.colours.blueDark)) vars.push(`--blue-700:${s.colours.blueDark.trim()}`)
  if (vars.length) out.push(`<style>:root{${vars.join(';')}}</style>`)
  const t = s.tracking
  if (t.gtmId && ID_RE.test(t.gtmId)) {
    out.push(`<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${t.gtmId}');</script>`)
  }
  // GA4 and Google Ads share one gtag.js; the Ads tag is only needed for the price list conversion
  const ga = t.ga4Id && ID_RE.test(t.ga4Id) ? t.ga4Id : ''
  const aw = t.googleAdsId && /^AW-\d+$/.test(t.googleAdsId.trim()) ? t.googleAdsId.trim() : ''
  if (ga || aw) {
    out.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${ga || aw}"></script>`)
    out.push(`<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${ga ? `gtag('config','${ga}');` : ''}${aw ? `gtag('config','${aw}');` : ''}</script>`)
  }
  if (t.metaPixelId && /^\d+$/.test(t.metaPixelId)) {
    out.push(`<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${t.metaPixelId}');fbq('track','PageView');</script>`)
  }
  return out.length ? '\n' + out.join('\n') : ''
}

function bodyStart(s: Settings): string {
  const id = s.tracking.gtmId
  if (id && ID_RE.test(id)) {
    return `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n`
  }
  return ''
}

/** The site-wide Dentist node, in the same key order as the approved build. */
export function practiceNode(s: Settings): Record<string, unknown> {
  const a = s.address
  const node: Record<string, unknown> = {
    '@type': 'Dentist',
    '@id': ORIGIN + '/#practice',
    name: s.practiceName,
    url: ORIGIN + '/',
    telephone: phoneIntl(s.phone),
    email: s.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${a.unit}, ${a.street}`,
      addressLocality: a.suburb,
      addressRegion: a.state,
      postalCode: a.postcode,
      addressCountry: 'AU',
    },
    geo: { '@type': 'GeoCoordinates', latitude: a.latitude, longitude: a.longitude },
    paymentAccepted: s.paymentAccepted,
    ...(areaServed(s).length ? { areaServed: areaServed(s) } : {}),
    openingHoursSpecification: hourGroups(s.hours).map((g) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: g.days.length === 1 ? g.days[0] : g.days,
      opens: g.opens,
      closes: g.closes,
    })),
  }
  const same = Object.values(s.socials).filter((u) => u && /^https?:\/\//.test(u))
  if (same.length) node.sameAs = same
  return node
}
