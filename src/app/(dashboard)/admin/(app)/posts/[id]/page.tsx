import Link from 'next/link'
import { notFound } from 'next/navigation'
import { payloadClient, requireUser } from '@/dashboard/lib/server'
import { PostEditor } from '@/dashboard/editors/PostEditor'
import { postOptions } from '../postdata'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Edit post' }

const rel = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number | null) ?? null)

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  const payload = await payloadClient()
  const d = await payload.findByID({ collection: 'posts', id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!d) notFound()
  const o = await postOptions(payload)
  return (
    <>
      <div className="pd-crumb"><Link href="/admin/posts">Blog Posts</Link> &rsaquo; {String(d.title)}</div>
      <div className="pd-head"><div className="grow"><h1>Edit post</h1></div></div>
      <PostEditor isNew={false} categories={o.categories} posts={o.posts} initial={{
        id: d.id, slug: String(d.slug), title: String(d.title), status: d.status === 'published' ? 'published' : 'draft',
        order: Number(d.order || 0), published: String(d.published || ''), author: String(d.author || 'Precision Dental'),
        categories: Array.isArray(d.categories) ? (d.categories as string[]) : [], readMinutes: Number(d.readMinutes || 1),
        excerpt: String(d.excerpt || ''), image: String(d.image || ''), imageMedia: rel(d.imageMedia), imageAlt: String(d.imageAlt || ''),
        imageCaption: String(d.imageCaption || ''), body: String(d.body || ''),
        faq: Array.isArray(d.faq) ? (d.faq as { q: string; a: string[] }[]) : [], risk: !!d.risk,
        related: Array.isArray(d.related) ? (d.related as string[]) : [],
        seo: { title: String(d.seoTitle || ''), description: String(d.seoDescription || ''), ogImage: String(d.ogImage || ''), ogImageMedia: rel(d.ogImageMedia), canonical: String(d.canonical || ''), noindex: !!d.noindex },
      }} />
    </>
  )
}
