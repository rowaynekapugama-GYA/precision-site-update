/**
 * QA: the visual page editor shows exactly the live page. For every page, the editor's
 * marked-up render (src/render/editable.ts) with the edit markers taken out must be
 * byte for byte the page that goes live. Run: npx tsx scripts/qa/editable-parity.ts
 */
import { loadContent } from '../../src/content/load'
import { makeCtx, renderPage } from '../../src/render/page'
import { externalLinks } from '../../src/render/site'
import { renderEditable } from '../../src/render/editable'

const strip = (h: string) => h
  .replace(/<style id="pd-edit-css">[\s\S]*?<\/style>\n/, '')
  .replace(/\n<script>try\{sessionStorage\.setItem\('pd_offer_seen','1'\)\}catch\(e\)\{\}<\/script>/, '')
  .replace(/<pd-e data-pde="[^"]*" data-t="(?:text|rich)">/g, '').replace(/<\/pd-e>/g, '')
  .replace(/<span class="pd-tok" contenteditable="false" data-pdt="[a-zA-Z]+">((?:(?!<\/span>)[\s\S])*?)<\/span>/g, '$1')
  .replace(/ data-pd[sihda]="[^"]*"/g, '')
const TRACKING = /<script>\(function\(w,d,s,l,i\)[\s\S]*?<\/script>|<script async src="https:\/\/www\.googletagmanager\.com[\s\S]*?<\/script>\n<script>window\.dataLayer[\s\S]*?<\/script>|<script>!function\(f,b,e,v,n,t,s\)[\s\S]*?<\/script>|<noscript><iframe src="https:\/\/www\.googletagmanager\.com[\s\S]*?<\/noscript>|<noscript><img height="1" width="1"[\s\S]*?<\/noscript>/g

// the JSON-LD block is not shown in the editor (its scanner reads the unmarked page), so it is left out of the comparison
// so is the screen-reader-only "about ..." text after Learn more buttons, which is added by a scan of the unmarked page
const noSchema = (h: string) => h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '<script type="application/ld+json"></script>')
  .replace(/<span class="sr-only"> about [^<]*<\/span>/g, '')

const content = loadContent()
const ctx = makeCtx(content)
let bad = 0, words = 0, photos = 0, links = 0
for (const page of content.pages) {
  const live = noSchema(externalLinks(renderPage(page, ctx)).replace(TRACKING, ''))
  const ed = renderEditable(page, makeCtx(content))
  words += (ed.match(/<pd-e /g) || []).length
  photos += (ed.match(/ data-pdi="/g) || []).length
  links += (ed.match(/ data-pdh="/g) || []).length
  const s = noSchema(strip(ed))
  if (s !== live) {
    bad++
    let i = 0
    while (i < s.length && s[i] === live[i]) i++
    console.log(`DIFF ${page.key} at ${i}:\n  editor: ${JSON.stringify(s.slice(i - 60, i + 80))}\n  live:   ${JSON.stringify(live.slice(i - 60, i + 80))}`)
  }
}
console.log(`${content.pages.length} pages, ${bad} differ; ${words} editable words, ${photos} photos, ${links} links marked`)
process.exit(bad ? 1 : 0)
