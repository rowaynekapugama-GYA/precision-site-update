/**
 * The live preview inside the page editor: the page as it would go live with the
 * editor's unsaved changes, with every editable spot marked (src/render/editable.ts).
 * Signed-in users only; nothing is saved. Section templates always come from the
 * database; only the words, photos, links, order and hidden state come from the editor.
 */
import { routeUser, json } from '@/dashboard/lib/routeAuth'
import { pullContent } from '@/cms/sync'
import { makeCtx } from '@/render/page'
import { renderEditable } from '@/render/editable'
import type { Chrome, Content, Field, Section } from '@/render/types'
import chrome from '../../../../../../content/chrome.json'

export const dynamic = 'force-dynamic'

type Body = { id?: number | string; sections?: Section[]; blocks?: { key: string; fields: Field[] }[] }

const cleanFields = (fields: unknown): Field[] =>
  Array.isArray(fields)
    ? fields.filter((f) => f && typeof f.id === 'string' && typeof f.value === 'string').map((f) => ({ ...f, value: String(f.value) }))
    : []

export async function POST(req: Request) {
  const { payload, user } = await routeUser(req)
  if (!user) return json(401, { error: 'Please sign in again.' })
  let body: Body
  try { body = await req.json() } catch { return json(400, { error: 'Bad request' }) }
  if (body.id === undefined || body.id === null) return json(400, { error: 'Bad request' })

  const doc = await payload.findByID({ collection: 'pages', id: body.id, depth: 0, overrideAccess: true, select: { key: true } }).catch(() => null)
  if (!doc) return json(404, { error: 'This page no longer exists.' })
  const db = await pullContent(payload)
  if (!db) return json(404, { error: 'The dashboard has no content yet.' })
  const page = db.pages.find((p) => p.key === doc.key)
  if (!page) return json(404, { error: 'This page no longer exists.' })

  // the editor's order, words and hidden state on top of the saved section templates
  if (Array.isArray(body.sections)) {
    const saved = new Map(page.sections.map((s) => [s.key, s]))
    const next: Section[] = []
    for (const s of body.sections) {
      const base = s && saved.get(s.key)
      if (!base) continue
      next.push({ ...base, fields: base.shared ? base.fields : cleanFields(s.fields), hidden: !!s.hidden })
      saved.delete(s.key)
    }
    page.sections = [...next, ...saved.values()]
  }
  for (const b of Array.isArray(body.blocks) ? body.blocks : []) {
    if (b && db.blocks[b.key]) db.blocks[b.key] = { ...db.blocks[b.key], fields: cleanFields(b.fields) }
  }

  const content: Content = { ...db, chrome: chrome as Chrome, articleCta: '' }
  const html = renderEditable(page, makeCtx(content))
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' } })
}
