import type { Payload } from 'payload'
import { primaryCategory } from '@/render/posts'

export async function postOptions(payload: Payload) {
  const all = await payload.find({
    collection: 'posts', limit: 2000, depth: 0, overrideAccess: true, sort: 'title',
    select: { title: true, slug: true, categories: true, status: true, order: true },
  })
  const cats = new Set<string>()
  for (const d of all.docs) for (const c of (Array.isArray(d.categories) ? (d.categories as string[]) : [])) cats.add(c)
  const sorted = [...cats].sort((a, b) => (a === 'Dental Articles' ? -1 : b === 'Dental Articles' ? 1 : a.localeCompare(b)))
  return {
    categories: sorted,
    posts: all.docs.filter((d) => d.status === 'published').map((d) => ({ slug: String(d.slug), title: String(d.title) })),
    maxOrder: Math.max(0, ...all.docs.map((d) => Number(d.order || 0))),
    primary: primaryCategory,
  }
}
