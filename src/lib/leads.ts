/** Helpers for the price list form route (kept out of the route file, which may only export handlers). */

export const ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'landing', 'referrer'] as const

export type Attr = Partial<Record<(typeof ATTR_KEYS)[number], string>>

/** 0412 345 678, +61 412 345 678, 61412345678 -> 0412 345 678 */
export function normaliseMobile(raw: string): string | null {
  const d = String(raw || '').replace(/[^\d+]/g, '')
  const m = /^(?:\+?61|0)(4\d{8})$/.exec(d)
  if (!m) return null
  const n = '0' + m[1]
  return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`
}

/** "google / cpc", "facebook / paid", "google / organic", "example.com / referral" or "direct" */
export function leadSource(a: Attr): string {
  if (a.utm_source) return a.utm_medium ? `${a.utm_source} / ${a.utm_medium}` : a.utm_source
  if (a.gclid || a.gbraid || a.wbraid) return 'google / cpc'
  if (a.msclkid) return 'bing / cpc'
  if (a.fbclid) return 'facebook / social'
  if (a.referrer) {
    try {
      const host = new URL(a.referrer).hostname.replace(/^www\./, '')
      if (/(^|\.)google\./.test(host)) return 'google / organic'
      if (/(^|\.)bing\.com$/.test(host)) return 'bing / organic'
      if (/(facebook|instagram)\.com$/.test(host)) return `${host} / social`
      return `${host} / referral`
    } catch { /* not a URL */ }
  }
  return 'direct'
}

