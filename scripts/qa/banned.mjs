/**
 * qa:banned. Fails on:
 *  - em dashes anywhere in the code, docs, dashboard text or site content
 *  - AHPRA trouble words in anything a reader sees (the reminder that quotes them
 *    is marked qa:allow): pain-free, guaranteed, best dentist/results, expert(s),
 *    number one, urgency wording
 *  - testimonial or review components in the site output
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SKIP = new Set(['node_modules', '.next', 'media', '.git', 'migrations'])
const EXT = /\.(ts|tsx|js|mjs|css|scss|json|md|html|txt|sh|xml)$/
const files = []
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (EXT.test(e.name) && !p.includes(`${path.sep}public${path.sep}assets${path.sep}`)) files.push(p)
  }
}
walk(ROOT)

const RULES = [
  ['em dash', /—/],
  ['"pain-free"', /\bpain[- ]?free\b/i],
  ['"guaranteed"', /\bguaranteed\b/i],
  ['"best" as a claim', /\bbest (?:dentists?|dental (?:care|clinic|practice|team)|practice|clinic|results?|in (?:brisbane|town|queensland))\b/i],
  ['"expert"', /\bexperts?\b/i],
  ['"number one"', /\b(?:number one|#1|leading dentist|top dentist)\b/i],
  ['urgency wording', /\b(?:hurry(?: up| now|!)|act now|limited time only|limited spots|don'?t miss out|while (?:stocks|spots) last|offer ends soon|book now before)/i],
  ['testimonial component', /class="[^"]*\b(?:testimonial|review-slider|reviews?)\b/i],
]

const problems = []
for (const f of files) {
  const rel = path.relative(ROOT, f)
  if (rel === path.join('scripts', 'qa', 'banned.mjs')) continue
  const lines = fs.readFileSync(f, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (/qa:allow/.test(line)) return
    for (const [name, re] of RULES) {
      if (re.test(line)) problems.push(`${rel}:${i + 1}  ${name}: ${line.trim().slice(0, 140)}`)
    }
  })
}
console.log(`qa:banned checked ${files.length} files`)
if (problems.length) {
  for (const p of problems.slice(0, 60)) console.log('  ' + p)
  console.log(`${problems.length} problem(s)`)
  process.exit(1)
}
console.log('clean')
