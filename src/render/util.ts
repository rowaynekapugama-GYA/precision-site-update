/** Small helpers shared by the renderer, the dashboard and the build scripts. */

export const ORIGIN = 'https://precisiondentistry.com.au'

/** Same output as Python's html.escape(s, quote=True), which produced the original site. */
export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/** A URL or path made safe inside a double-quoted attribute, leaving & alone. */
export function attr(s: string): string {
  return String(s ?? '').replace(/"/g, '&quot;').replace(/</g, '%3C').replace(/>/g, '%3E')
}

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', copy: '\u00a9', reg: '\u00ae',
  trade: '\u2122', rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201d', ldquo: '\u201c',
  ndash: '\u2013', mdash: '\u2014', hellip: '\u2026', middot: '\u00b7', deg: '\u00b0',
  times: '\u00d7', laquo: '\u00ab', raquo: '\u00bb', eacute: '\u00e9', bull: '\u2022',
}

export function unescapeHtml(s: string): string {
  return String(s ?? '').replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : m
    }
    return NAMED[e] ?? m
  })
}

/** Visible text of a fragment of markup. */
export function plain(s: string): string {
  return unescapeHtml(String(s ?? '').replace(/<[^>]+>/g, ''))
}

/** JSON exactly as Python's json.dumps(obj, indent=2, ensure_ascii=False) writes it. */
export function pyJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2)
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December']

/** 2022-09-30 -> 30 September 2022 */
export function auDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`
}

/** Today's date in Brisbane, as YYYY-MM-DD. */
export function todayBrisbane(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** A page or post address to the site path it is written to. */
export function slugify(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '')
}

/** Friendly names for the practice-detail placeholders, as shown in the dashboard. */
export const TOKEN_NAMES: Record<string, string> = {
  phone: 'phone',
  phoneTel: 'phone-link',
  email: 'email',
  address: 'address',
  addressLines: 'address-lines',
  addressShort: 'address-short',
  addressStreet: 'address-street',
  streetShort: 'street-short',
  street: 'street',
  suburb: 'suburb',
  abn: 'abn',
  booking: 'booking-link',
  preferredFunds: 'preferred-funds',
  parking: 'parking',
  hoursSummary: 'hours-summary',
  hoursList: 'hours-list',
  hoursRows: 'hours-rows',
  mapEmbed: 'map',
  logo: 'logo',
}

const FRIENDLY_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(TOKEN_NAMES).map(([k, v]) => [v, k]),
)

/** {{site:phone}} -> {phone} for display in the dashboard. */
export function tokensToFriendly(s: string): string {
  return String(s ?? '').replace(/\{\{site:([a-zA-Z]+)\}\}/g, (m, k: string) =>
    TOKEN_NAMES[k] ? `{${TOKEN_NAMES[k]}}` : m)
}

/** {phone} -> {{site:phone}} when saving from the dashboard. */
export function friendlyToTokens(s: string): string {
  return String(s ?? '').replace(/\{([a-z-]+)\}/g, (m, k: string) =>
    FRIENDLY_TO_KEY[k] ? `{{site:${FRIENDLY_TO_KEY[k]}}}` : m)
}

/**
 * The street line as the Google Business Profile writes it. A short unit code ("S13", "2",
 * "G04") joins the street with a slash, "S13/520 Wickham St"; a longer unit ("Level 2") with
 * a comma. Empty unit: just the street.
 */
export function streetLine(a: { unit?: string; street?: string }): string {
  const unit = String(a.unit || '').trim()
  const street = String(a.street || '').trim()
  if (!unit) return street
  return /^[A-Za-z]{0,3}\d+[A-Za-z]?$/.test(unit) ? `${unit}/${street}` : `${unit}, ${street}`
}

