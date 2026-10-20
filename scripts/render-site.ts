/**
 * Build step: write the public site from content/ into public/.
 *
 * Pages become public/<path>.html (served at /<path>/ by middleware.ts), plus
 * sitemap.xml and robots.txt. The list of addresses and redirects is written to
 * src/generated/site-routes.json for the middleware. Files written by an earlier
 * render that are no longer part of the site are removed.
 */
import './load-env'
import fs from 'node:fs'
import path from 'node:path'
import { loadContent } from '../src/content/load'
import { renderSite, siteRoutes } from '../src/render/site'
import { priceListFile } from '../src/render/priceList'

const root = process.cwd()
const pub = path.join(root, 'public')
const manifestPath = path.join(pub, '.generated.json')

const content = loadContent()
const files = renderSite(content)

const previous: string[] = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : []
for (const f of previous) {
  if (!files.has(f)) {
    const p = path.join(pub, f)
    if (fs.existsSync(p)) fs.unlinkSync(p)
  }
}
for (const [f, html] of files) {
  const p = path.join(pub, f)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, html)
}
fs.writeFileSync(manifestPath, JSON.stringify([...files.keys()].sort(), null, 1) + '\n')

const redirects = (content.redirects || []).filter((r) => r.from && r.to).map((r) => ({
  from: '/' + r.from.trim().replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '').replace(/\/+$/, '') + '/',
  to: r.to.trim(),
  permanent: r.permanent !== false,
}))
const routes = { routes: siteRoutes(content), redirects }
fs.mkdirSync(path.join(root, 'src', 'generated'), { recursive: true })
fs.writeFileSync(path.join(root, 'src', 'generated', 'site-routes.json'), JSON.stringify(routes, null, 1) + '\n')

// what the price list route needs to know, so it never has to read the database
// the PDF is the one uploaded in the dashboard, else the one the build writes from data/price-list.json;
// emails need a full address, on whichever domain this deployment serves
const leadSettings = content.settings
const plFile = priceListFile(leadSettings)
const siteOrigin = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : '') || 'https://precisiondentistry.com.au').replace(/\/+$/, '')
fs.writeFileSync(path.join(root, 'src', 'generated', 'lead-config.json'), JSON.stringify({
  phone: leadSettings.phone,
  priceList: {
    delivery: leadSettings.priceList?.delivery === 'website' ? 'website' : 'smileox',
    file: /^https?:\/\//i.test(plFile) ? plFile : siteOrigin + (plFile.startsWith('/') ? plFile : '/' + plFile),
  },
}, null, 1) + '\n')

// a list of the built-in photos, for the Media Library's "Website photos" tab
const imgs: string[] = []
const walk = (d: string) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(webp|jpe?g|png|gif|avif)$/i.test(e.name)) imgs.push('/' + path.relative(pub, p).split(path.sep).join('/'))
  }
}
walk(path.join(pub, 'assets', 'img'))
fs.writeFileSync(path.join(root, 'src', 'generated', 'site-images.json'), JSON.stringify(imgs.sort(), null, 1) + '\n')

console.log(`render: ${files.size} files, ${routes.routes.length} addresses, ${redirects.length} redirects, ${imgs.length} built-in photos`)
