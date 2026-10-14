/**
 * Which addresses the dashboard is served from. Payload treats a request from an
 * origin it does not know as signed out, so every address Vercel can serve the
 * site on is listed. On preview deployments the server URL is left blank so the
 * dashboard talks to the preview, not the live site.
 */
const clean = (u?: string) => (u ? u.replace(/\/+$/, '') : '')
const https = (h?: string) => (h ? (h.startsWith('http') ? clean(h) : `https://${clean(h)}`) : '')

export const LIVE = clean(process.env.NEXT_PUBLIC_SERVER_URL) || 'https://precisiondentistry.com.au'

export const serverURL = process.env.VERCEL_ENV === 'preview' ? '' : clean(process.env.NEXT_PUBLIC_SERVER_URL)

export function allowedOrigins(): string[] {
  const list = new Set<string>()
  const add = (u: string) => { if (u) list.add(u) }
  add(LIVE)
  try {
    const u = new URL(LIVE)
    const bare = u.hostname.replace(/^www\./, '')
    add(`https://${bare}`)
    add(`https://www.${bare}`)
  } catch { /* ignore */ }
  add(https(process.env.VERCEL_URL))
  add(https(process.env.VERCEL_BRANCH_URL))
  add(https(process.env.VERCEL_PROJECT_PRODUCTION_URL))
  for (const extra of (process.env.EXTRA_ORIGINS || '').split(',')) add(clean(extra.trim()))
  if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_LOCALHOST === 'true') {
    add('http://localhost:3000')
    add('http://127.0.0.1:3000')
  }
  return [...list]
}
