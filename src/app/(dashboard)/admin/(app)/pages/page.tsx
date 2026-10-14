import { payloadClient, requireUser } from '@/dashboard/lib/server'
import { PagesList } from '@/dashboard/editors/Lists'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pages' }

export default async function Pages() {
  await requireUser()
  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'pages', limit: 1000, depth: 0, overrideAccess: true, sort: 'label',
    select: { label: true, url: true, group: true, noindex: true, updatedAt: true, key: true },
  })
  const rows = res.docs.map((d) => ({ id: d.id, label: String(d.label), url: String(d.url || ''), group: String(d.group || ''), noindex: !!d.noindex, updatedAt: String(d.updatedAt) }))
  rows.sort((a, b) => (a.url === '/' ? -1 : b.url === '/' ? 1 : a.label.localeCompare(b.label)))
  return (
    <>
      <div className="pd-head"><div className="grow"><h1>Pages</h1><p className="pd-sub">Every page of the website. Open one to change its wording, photos, section order and SEO.</p></div></div>
      <PagesList rows={rows} />
    </>
  )
}
