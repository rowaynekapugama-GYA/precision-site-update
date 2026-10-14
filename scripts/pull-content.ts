/**
 * Build step: copy what the practice has saved in the dashboard into content/.
 *
 * Skipped when there is no database or it has not been imported yet, so the
 * build then uses the JSON committed in the repo and the live site cannot break
 * because of the CMS.
 */
import './load-env'
import fs from 'node:fs'
import path from 'node:path'
import { CONTENT_DIR, pageFileName, writeJson } from '../src/content/load'

const out = process.argv[2] || CONTENT_DIR
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.log('pull: no DATABASE_URL, building from the JSON in the repo')
  process.exit(0)
}
try {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const { pullContent } = await import('../src/cms/sync')
  const payload = await getPayload({ config })
  const c = await pullContent(payload)
  if (!c) {
    console.log('pull: the database has no pages yet (run Import), building from the JSON in the repo')
    process.exit(0)
  }
  let changed = 0
  const w = (p: string, v: unknown) => { if (writeJson(p, v)) changed++ }
  for (const p of c.pages) w(path.join(out, 'pages', pageFileName(p.key)), p)
  for (const b of Object.values(c.blocks)) w(path.join(out, 'blocks', `${b.key}.json`), b)
  const postDir = path.join(out, 'posts')
  const keep = new Set(c.posts.map((p) => `${p.slug}.json`))
  if (fs.existsSync(postDir)) {
    for (const f of fs.readdirSync(postDir)) {
      if (f.endsWith('.json') && !keep.has(f)) { fs.unlinkSync(path.join(postDir, f)); changed++ }
    }
  }
  for (const p of c.posts) w(path.join(postDir, `${p.slug}.json`), p)
  w(path.join(out, 'team.json'), c.team)
  w(path.join(out, 'site-settings.json'), c.settings)
  w(path.join(out, 'redirects.json'), c.redirects)
  w(path.join(out, 'before-after.json'), c.beforeAfter)
  console.log(`pull: ${c.pages.length} pages, ${c.posts.length} posts, ${c.team.length} team; ${changed} files changed`)
  process.exit(0)
} catch (err) {
  console.error(`pull: the database could not be read (${(err as Error).message}); building from the JSON in the repo`)
  process.exit(0)
}
