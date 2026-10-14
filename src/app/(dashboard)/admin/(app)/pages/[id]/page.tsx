import Link from 'next/link'
import { notFound } from 'next/navigation'
import { payloadClient, requireUser } from '@/dashboard/lib/server'
import { PageEditor } from '@/dashboard/editors/PageEditor'
import { blockFromDoc, loadMediaMap } from '@/cms/sync'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await payloadClient()
  const d = await payload.findByID({ collection: 'pages', id, depth: 0, overrideAccess: true, select: { label: true } }).catch(() => null)
  return { title: d ? `Edit ${d.label}` : 'Page' }
}

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  const payload = await payloadClient()
  const doc = await payload.findByID({ collection: 'pages', id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!doc) notFound()
  const model = JSON.parse(String(doc.model))
  const media = await loadMediaMap(payload)
  const sharedKeys = [...new Set((model.sections as { shared?: string }[]).map((s) => s.shared).filter(Boolean))] as string[]
  const blocks = []
  for (const key of sharedKeys) {
    const b = await payload.find({ collection: 'shared-blocks', where: { key: { equals: key } }, limit: 1, depth: 0, overrideAccess: true })
    if (b.docs[0]) blocks.push({ id: b.docs[0].id, ...blockFromDoc(b.docs[0] as Record<string, any>, media) })
  }
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true }) as Record<string, any>
  const ogId = doc.ogImageMedia && typeof doc.ogImageMedia === 'object' ? (doc.ogImageMedia as { id: number }).id : doc.ogImageMedia
  return (
    <>
      <div className="pd-crumb"><Link href="/admin/pages">Pages</Link> &rsaquo; {String(doc.label)}</div>
      <div className="pd-head"><div className="grow"><h1>{String(doc.label)}</h1><p className="pd-sub">{doc.url ? `precisiondentistry.com.au${doc.url}` : 'Shown when someone visits an address that does not exist'}</p></div></div>
      <PageEditor
        id={doc.id}
        label={String(doc.label)}
        url={doc.url ? String(doc.url) : null}
        model={model}
        seo={{
          title: String(doc.seoTitle ?? ''), description: String(doc.seoDescription ?? ''), ogImage: String(doc.ogImage ?? ''),
          ogImageMedia: (ogId as number) ?? null, canonical: String(doc.canonical ?? ''), noindex: !!doc.noindex,
        }}
        blocks={blocks}
        defaultOg={String(settings?.seoDefaults?.ogImage || '/assets/img/og-image.jpg')}
        defaultTitle={`${String(doc.label)} | Precision Dental`}
        lastmod={doc.lastmod ? String(doc.lastmod) : null}
      />
    </>
  )
}
