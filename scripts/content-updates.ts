/**
 * Apply the release's content updates (src/content/updates.ts).
 *
 *   --files   to the JSON in content/ (and content/chrome.json); GYA runs this once
 *             when preparing a release
 *   (none)    to the dashboard's database; a build step, before the pull. Each update
 *             is applied once per database and recorded in site-status.appliedUpdates,
 *             so a later change made in the dashboard is never undone by a build.
 *
 * Without a database, or before the content has been imported, there is nothing to do:
 * the JSON in the repo already has every update.
 */
import './load-env'
import path from 'node:path'
import { CONTENT_DIR, loadContent, pageFileName, writeJson } from '../src/content/load'
import { UPDATES, type Editable } from '../src/content/updates'

const repo = loadContent()

if (process.argv.includes('--files')) {
  const c: Editable = {
    pages: repo.pages, blocks: repo.blocks, team: repo.team, settings: repo.settings,
    beforeAfter: repo.beforeAfter, chrome: { ...repo.chrome }, posts: repo.posts,
  }
  const before = new Map(repo.pages.map((p) => [p.key, JSON.stringify(p)]))
  const postsBefore = new Map(repo.posts.map((p) => [p.slug, JSON.stringify(p)]))
  for (const u of UPDATES) {
    const done = u.apply(c, repo)
    console.log(`${u.id}: ${done.length ? done.join('; ') : 'nothing to change'}`)
  }
  for (const p of c.pages) {
    if (before.get(p.key) !== JSON.stringify(p)) writeJson(path.join(CONTENT_DIR, 'pages', pageFileName(p.key)), p)
  }
  for (const p of c.posts || []) {
    if (postsBefore.get(p.slug) !== JSON.stringify(p)) writeJson(path.join(CONTENT_DIR, 'posts', `${p.slug}.json`), p)
  }
  writeJson(path.join(CONTENT_DIR, 'chrome.json'), c.chrome)
  for (const b of Object.values(c.blocks)) writeJson(path.join(CONTENT_DIR, 'blocks', `${b.key}.json`), b)
  // new team members are appended by updates; the file is kept in the order the dashboard shows
  writeJson(path.join(CONTENT_DIR, 'team.json'), [...c.team].sort((a, b) => a.order - b.order))
  writeJson(path.join(CONTENT_DIR, 'site-settings.json'), c.settings)
  process.exit(0)
}

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.log('content updates: no DATABASE_URL, nothing to do')
  process.exit(0)
}

try {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const sync = await import('../src/cms/sync')
  const payload = await getPayload({ config })
  const count = await payload.count({ collection: 'pages', overrideAccess: true })
  if (!count.totalDocs) {
    console.log('content updates: the database has no pages yet (Import brings in the release as it is)')
    process.exit(0)
  }
  const status = await payload.findGlobal({ slug: 'site-status', depth: 0, overrideAccess: true }) as Record<string, any>
  const applied = new Set(String(status.appliedUpdates || '').split(',').map((s) => s.trim()).filter(Boolean))
  const pending = UPDATES.filter((u) => !applied.has(u.id))
  if (!pending.length) {
    console.log('content updates: all applied')
    process.exit(0)
  }

  const media = await sync.loadMediaMap(payload)
  const all = async (collection: string) =>
    (await payload.find({ collection: collection as any, limit: 100000, depth: 0, pagination: false, overrideAccess: true })).docs as Record<string, any>[]
  const pageDocs = await all('pages')
  const teamDocs = await all('team')
  const settingsDoc = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true }) as Record<string, any>
  // shared blocks (the contact section, the Book Your Visit band) and posts live in the database too
  const blockDocs = await all('shared-blocks')
  const postDocs = await all('posts')

  const c: Editable = {
    pages: pageDocs.map((d) => sync.pageFromDoc(d, media)),
    blocks: Object.fromEntries(blockDocs.map((d) => [d.key, sync.blockFromDoc(d, media)])),
    posts: postDocs.map((d) => sync.postFromDoc(d, media)),
    team: teamDocs.map((d) => sync.teamFromDoc(d, media)),
    settings: sync.settingsFromDoc(settingsDoc, media, await sync.loadDocumentMap(payload)),
    beforeAfter: [],
  }
  const pageBefore = c.pages.map((p) => JSON.stringify(sync.pageToDoc(p)))
  const teamBefore = c.team.map((t) => JSON.stringify(sync.teamToDoc(t)))
  const settingsBefore = JSON.stringify(sync.settingsToDoc(c.settings))
  const blocksBefore = new Map(Object.values(c.blocks).map((b) => [b.key, JSON.stringify(sync.blockToDoc(b))]))
  const postsBefore = (c.posts || []).map((p) => JSON.stringify(sync.postToDoc(p)))
  const nPages = c.pages.length

  for (const u of pending) {
    const done = u.apply(c, repo)
    console.log(`content updates: ${u.id}: ${done.length ? done.join('; ') : 'already in place'}`)
  }

  const ctx = { context: sync.CTX, overrideAccess: true, depth: 0 } as const
  for (let i = 0; i < c.pages.length; i++) {
    const doc = sync.pageToDoc(c.pages[i])
    if (i >= nPages) await payload.create({ collection: 'pages', data: doc as any, ...ctx })
    else if (JSON.stringify(doc) !== pageBefore[i]) await payload.update({ collection: 'pages', id: pageDocs[i].id, data: doc as any, ...ctx })
  }
  for (let i = 0; i < c.team.length; i++) {
    const doc = sync.teamToDoc(c.team[i])
    if (i >= teamBefore.length) await payload.create({ collection: 'team', data: doc as any, ...ctx })
    else if (JSON.stringify(doc) !== teamBefore[i]) await payload.update({ collection: 'team', id: teamDocs[i].id, data: doc as any, ...ctx })
  }
  for (const d of blockDocs) {
    const b = c.blocks[d.key]
    if (!b) continue
    const doc = sync.blockToDoc(b)
    if (JSON.stringify(doc) !== blocksBefore.get(b.key)) await payload.update({ collection: 'shared-blocks', id: d.id, data: doc as any, ...ctx })
  }
  for (let i = 0; i < postDocs.length; i++) {
    const doc = sync.postToDoc((c.posts || [])[i])
    if (JSON.stringify(doc) !== postsBefore[i]) await payload.update({ collection: 'posts', id: postDocs[i].id, data: doc as any, ...ctx })
  }
  const sDoc = sync.settingsToDoc(c.settings)
  if (JSON.stringify(sDoc) !== settingsBefore) await payload.updateGlobal({ slug: 'site-settings', data: sDoc as any, context: sync.CTX, overrideAccess: true })

  for (const u of pending) applied.add(u.id)
  await payload.updateGlobal({ slug: 'site-status', data: { appliedUpdates: [...applied].join(',') } as any, context: sync.CTX, overrideAccess: true })
  process.exit(0)
} catch (err) {
  console.error(`content updates: not applied (${(err as Error).message}); the build carries on`)
  process.exit(0)
}
