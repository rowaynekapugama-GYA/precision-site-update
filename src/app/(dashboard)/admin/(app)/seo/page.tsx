import { payloadClient, requireUser } from '@/dashboard/lib/server'
import { SeoOverview } from '@/dashboard/editors/SeoOverview'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'SEO' }

const rel = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number | null) ?? null)

export default async function Seo() {
  await requireUser()
  const payload = await payloadClient()
  const s = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true }) as Record<string, any>
  const defOg = String(s?.seoDefaults?.ogImage || '/assets/img/og-image.jpg')
  const pages = await payload.find({ collection: 'pages', limit: 1000, depth: 0, overrideAccess: true, sort: 'label',
    select: { label: true, url: true, seoTitle: true, seoDescription: true, ogImage: true, ogImageMedia: true, canonical: true, noindex: true } })
  const posts = await payload.find({ collection: 'posts', limit: 2000, depth: 0, overrideAccess: true, sort: 'title',
    select: { title: true, slug: true, status: true, image: true, seoTitle: true, seoDescription: true, ogImage: true, ogImageMedia: true, canonical: true, noindex: true } })
  const rows = [
    ...pages.docs.filter((d) => d.url).map((d) => ({
      kind: 'page' as const, id: d.id, label: String(d.label), url: String(d.url), live: true, defaultOg: defOg,
      seo: { title: String(d.seoTitle || ''), description: String(d.seoDescription || ''), ogImage: String(d.ogImage || ''), ogImageMedia: rel(d.ogImageMedia), canonical: String(d.canonical || ''), noindex: !!d.noindex },
    })),
    ...posts.docs.map((d) => ({
      kind: 'post' as const, id: d.id, label: String(d.title), url: `/${d.slug}/`, live: d.status === 'published', defaultOg: String(d.image || defOg),
      seo: { title: String(d.seoTitle || ''), description: String(d.seoDescription || ''), ogImage: String(d.ogImage || ''), ogImageMedia: rel(d.ogImageMedia), canonical: String(d.canonical || ''), noindex: !!d.noindex },
    })),
  ]
  return (
    <>
      <div className="pd-head"><div className="grow"><h1>SEO</h1><p className="pd-sub">How each page and post appears in Google. Titles work best between 30 and 60 characters, descriptions between 70 and 155.</p></div></div>
      <SeoOverview initial={rows} />
    </>
  )
}
