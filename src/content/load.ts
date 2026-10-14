/** Read the repo's content/ folder (the JSON model) from disk. */
import fs from 'node:fs'
import path from 'node:path'
import type { BeforeAfterCase, Block, Chrome, Content, Page, Post, Redirect, Settings, TeamMember } from '../render/types'
import { withLeadDefaults } from '../render/leads'

export const CONTENT_DIR = process.env.CONTENT_DIR || path.join(process.cwd(), 'content')

function readJson<T>(p: string, fallback?: T): T {
  if (!fs.existsSync(p)) {
    if (fallback !== undefined) return fallback
    throw new Error(`missing ${p}`)
  }
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T
}

function readDir<T>(dir: string): T[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort()
    .map((f) => readJson<T>(path.join(dir, f)))
}

export function loadContent(dir = CONTENT_DIR): Content {
  const blocks: Record<string, Block> = {}
  for (const b of readDir<Block>(path.join(dir, 'blocks'))) blocks[b.key] = b
  return {
    chrome: readJson<Chrome>(path.join(dir, 'chrome.json')),
    settings: withLeadDefaults(readJson<Settings>(path.join(dir, 'site-settings.json'))),
    blocks,
    articleCta: '',
    pages: readDir<Page>(path.join(dir, 'pages')),
    posts: readDir<Post>(path.join(dir, 'posts')),
    team: readJson<TeamMember[]>(path.join(dir, 'team.json'), []),
    redirects: readJson<Redirect[]>(path.join(dir, 'redirects.json'), []),
    beforeAfter: readJson<BeforeAfterCase[]>(path.join(dir, 'before-after.json'), []),
  }
}

export function pageFileName(key: string): string {
  return key.replace(/\//g, '__') + '.json'
}

export function writeJson(p: string, obj: unknown): boolean {
  const text = JSON.stringify(obj, null, 2) + '\n'
  fs.mkdirSync(path.dirname(p), { recursive: true })
  if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === text) return false
  fs.writeFileSync(p, text)
  return true
}
