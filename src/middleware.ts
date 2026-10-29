/**
 * Public addresses for a fully static site, the way the old vercel.json did it
 * (cleanUrls + trailingSlash), plus the dashboard's redirects.
 *
 *   /about-us        -> 308 /about-us/
 *   /about-us.html   -> 308 /about-us/
 *   /about-us/       -> serves public/about-us.html
 *   anything else    -> the site's own 404 page, with a 404 status
 *
 * /admin, /cms, /api and /_next are left to Next.js and Payload.
 */
import { NextResponse, type NextRequest } from 'next/server'
import site from './generated/site-routes.json'

const ROUTES = new Set<string>(site.routes)
const REDIRECTS = new Map<string, { to: string; permanent: boolean }>(
  site.redirects.map((r: { from: string; to: string; permanent: boolean }) => [r.from, r]),
)

const APP = /^\/(admin|cms|api|_next)(\/|$)/

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const p = url.pathname

  if (p === '/cms/create-first-user' || p.startsWith('/cms/create-first-user/')) {
    if (process.env.ALLOW_FIRST_USER !== 'true') return notFound(req)
  }
  if (APP.test(p)) return NextResponse.next()

  const withSlash = p.endsWith('/') ? p : p + '/'
  const r = REDIRECTS.get(withSlash) || REDIRECTS.get(p)
  if (r) {
    const dest = /^https?:\/\//i.test(r.to) ? r.to : new URL(r.to, url.origin).toString()
    return NextResponse.redirect(dest, r.permanent ? 301 : 302)
  }

  if (/\.html$/i.test(p)) {
    const clean = p === '/index.html' ? '/' : p.replace(/\.html$/i, '/')
    if (ROUTES.has(clean)) return NextResponse.redirect(new URL(clean + url.search, url.origin), 308)
    return NextResponse.next()
  }
  if (/\.[a-z0-9]{1,6}$/i.test(p)) return NextResponse.next()   // assets, sitemap.xml, robots.txt

  if (!p.endsWith('/')) {
    return NextResponse.redirect(new URL(p + '/' + url.search, url.origin), 308)
  }
  if (ROUTES.has(p)) {
    const file = p === '/' ? '/index.html' : p.slice(0, -1) + '.html'
    return NextResponse.rewrite(new URL(file + url.search, url.origin))
  }
  return notFound(req)
}

async function notFound(req: NextRequest) {
  const res = await fetch(new URL('/404.html', req.nextUrl.origin))
  return new NextResponse(await res.text(), {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|assets/).*)'],
}
