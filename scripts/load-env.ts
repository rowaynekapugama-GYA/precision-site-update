/** Imported first by every script: tsx does not read .env on its own. */
import fs from 'node:fs'
import path from 'node:path'

for (const name of ['.env.local', '.env']) {
  const p = path.join(process.cwd(), name)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (!m || process.env[m[1]] !== undefined) continue
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}
