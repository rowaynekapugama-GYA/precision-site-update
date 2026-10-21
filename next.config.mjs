import { withPayload } from '@payloadcms/next/withPayload'

/** The headers the static site had in vercel.json, now applied by Next.js. */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // the public pages handle their own trailing slash in middleware.ts; /admin,
  // /cms and /api must never be redirected
  skipTrailingSlashRedirect: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  outputFileTracingIncludes: {
    '/api/dashboard/import': ['./content/**/*'],
    '/admin/preview/[kind]/[id]': ['./content/chrome.json'],
    '/api/dashboard/preview/[kind]/[id]': ['./content/chrome.json'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: '(.*)\\.vercel\\.app' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      { source: '/assets/img/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' }] },
      { source: '/assets/css/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] },
      { source: '/assets/js/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      // the price list is only for people who ask for it through the form
      { source: '/downloads/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }, { key: 'Cache-Control', value: 'private, max-age=0, must-revalidate' }] },
      { source: '/cms/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/:path*', headers: securityHeaders },
    ]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
