/**
 * qa:secrets. Looks through everything that would be committed (or a folder or
 * unzipped release given as an argument) for keys, tokens, database passwords and
 * the first-admin seed password, which must only ever live in the environment.
 *   node scripts/qa/secrets.mjs [folder]
 * The seed password to look for can be passed as SEED_ADMIN_PASSWORD (it is never
 * written here).
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.argv[2] || process.cwd())
const SKIP = new Set(['node_modules', '.next', '.git'])
const ignored = (rel) => /^\.env(\..*)?$/.test(path.basename(rel)) && !rel.endsWith('.env.example')
const PATTERNS = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['Vercel Blob token', /vercel_blob_rw_[A-Za-z0-9]{16,}/],
  ['SMTP2GO API key', /\bapi-[A-F0-9]{32}\b/],
  ['GitHub token', /\b(?:ghp|gho|github_pat)_[A-Za-z0-9_]{20,}/],
  ['database URL with a password', /postgres(?:ql)?:\/\/[^\s:@/]+:(?!PASSWORD|password|localdev@localhost)[^\s@/]{6,}@(?!localhost)/],
  ['Vercel deploy hook', /api\.vercel\.com\/v1\/integrations\/deploy\/[A-Za-z0-9_]{6,}\/[A-Za-z0-9]{6,}/],
  ['hard-coded PAYLOAD_SECRET', /PAYLOAD_SECRET\s*=\s*["']?[A-Za-z0-9+/=_-]{24,}/],
]
const seed = process.env.SEED_ADMIN_PASSWORD
if (seed) PATTERNS.push(['the seed admin password', new RegExp(seed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))])

const hits = []
let n = 0
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue
    const p = path.join(d, e.name)
    const rel = path.relative(ROOT, p)
    if (e.isDirectory()) { walk(p); continue }
    if (ignored(rel)) continue
    const st = fs.statSync(p)
    if (st.size > 5 * 1024 * 1024) continue
    const buf = fs.readFileSync(p)
    if (buf.includes(0)) continue // binary
    n++
    const text = buf.toString('utf8')
    for (const [name, re] of PATTERNS) {
      const m = re.exec(text)
      if (m) hits.push(`${rel}: ${name}`)
    }
  }
}
walk(ROOT)
console.log(`qa:secrets checked ${n} text files in ${ROOT}${seed ? ' (including the seed password)' : ''}`)
if (hits.length) { hits.forEach((h) => console.log('  ' + h)); process.exit(1) }
console.log('clean')
