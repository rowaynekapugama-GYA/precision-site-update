/**
 * Preview a page or post as it is saved in the dashboard, before publishing.
 * Signed-in users only; never indexed.
 */
import { routeUser } from '@/dashboard/lib/routeAuth'
import { pullContent } from '@/cms/sync'
import { makeCtx, renderPage } from '@/render/page'
import { renderPost } from '@/render/site'
import type { Chrome, Content } from '@/render/types'
import chrome from '../../../../../../../content/chrome.json'

export const dynamic = 'force-dynamic'

const BAR = '<div style="position:fixed;z-index:99999;left:50%;bottom:16px;transform:translateX(-50%);background:#012A41;color:#fff;font:600 14px/1.3 system-ui,sans-serif;padding:10px 16px;border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,.3)">Preview: this is what will go live when you press Publish website</div>'

export async function GET(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { payload, user } = await routeUser(req)
  if (!user) return new Response('Not found', { status: 404 })
  const { kind, id } = await params
  const db = await pullContent(payload)
  if (!db) return new Response('The dashboard has no content yet. Run Import first.', { status: 404 })
  const content: Content = { ...db, chrome: chrome as Chrome, articleCta: '' }
  const ctx = makeCtx(content)
  let html = ''
  if (kind === 'page') {
    const doc = await payload.findByID({ collection: 'pages', id, depth: 0, overrideAccess: true, select: { key: true } }).catch(() => null)
    const page = doc && content.pages.find((p) => p.key === doc.key)
    if (!page) return new Response('Not found', { status: 404 })
    html = renderPage(page, ctx)
  } else if (kind === 'post') {
    const doc = await payload.findByID({ collection: 'posts', id, depth: 0, overrideAccess: true, select: { slug: true } }).catch(() => null)
    const post = doc && content.posts.find((p) => p.slug === doc.slug)
    if (!post) return new Response('Not found', { status: 404 })
    html = renderPost({ ...post, status: 'published' }, ctx)
  } else {
    return new Response('Not found', { status: 404 })
  }
  // tracking never runs in a preview
  html = html.replace(/<script>\(function\(w,d,s,l,i\)[\s\S]*?<\/script>|<script async src="https:\/\/www\.googletagmanager\.com[\s\S]*?<\/script>\n<script>window\.dataLayer[\s\S]*?<\/script>|<script>!function\(f,b,e,v,n,t,s\)[\s\S]*?<\/script>/g, '')
  html = html.replace('</body>', `${BAR}\n</body>`)
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' } })
}
