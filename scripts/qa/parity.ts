/**
 * Render the site from content/ and compare it with a reference build, file by file.
 * usage: tsx scripts/qa/parity.ts <reference site dir> [content dir]
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadContent } from '../../src/content/load'
import { renderSite } from '../../src/render/site'

const ref = process.argv[2]
const dir = process.argv[3]
const files = renderSite(loadContent(dir))
let same = 0
const diff: string[] = []
for (const [f, html] of files) {
  const p = path.join(ref, f)
  if (!fs.existsSync(p)) { diff.push(`${f}: not in reference`); continue }
  const want = fs.readFileSync(p, 'utf8')
  if (want === html) { same++; continue }
  let i = 0
  while (i < want.length && want[i] === html[i]) i++
  diff.push(`${f}: first difference at ${i}\n    want: ${JSON.stringify(want.slice(Math.max(0, i - 60), i + 100))}\n    got : ${JSON.stringify(html.slice(Math.max(0, i - 60), i + 100))}`)
}
const refHtml = fs.readdirSync(ref, { recursive: true }).map(String)
  .filter((f) => (f.endsWith('.html') || f === 'sitemap.xml' || f === 'robots.txt') && !files.has(f))
for (const f of refHtml) diff.push(`${f}: in reference, not rendered`)
console.log(`${same} of ${files.size} files identical`)
for (const d of diff.slice(0, 15)) console.log(' - ' + d)
if (diff.length > 15) console.log(`   ... ${diff.length - 15} more`)
process.exit(diff.length ? 1 : 0)
