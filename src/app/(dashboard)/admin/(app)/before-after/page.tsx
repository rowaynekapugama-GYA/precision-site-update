import { payloadClient, requireUser } from '@/dashboard/lib/server'
import { BeforeAfterEditor, type CaseRow } from '@/dashboard/editors/BeforeAfterEditor'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Before & After' }

const rel = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number)) ?? null

export default async function BeforeAfterPage() {
  await requireUser()
  const payload = await payloadClient()
  // the treatment pages that have a before and after gallery
  const pages = (await payload.find({ collection: 'pages', limit: 500, depth: 0, pagination: false, overrideAccess: true })).docs
    .filter((d) => String(d.model || '').includes('"generated":"beforeAfter"'))
    .map((d) => ({ key: String(d.key), label: String(d.label || d.key).replace(/\s+in Fortitude Valley$/i, ''), url: String(d.url || '') }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const res = await payload.find({ collection: 'before-after', limit: 1000, sort: 'order', depth: 1, overrideAccess: true })
  const rows: CaseRow[] = res.docs.map((d) => ({
    id: d.id, ref: String(d.ref || ''), page: String(d.page || ''), title: String(d.title || ''),
    before: String((d.beforeMedia as any)?.url || d.before || ''), beforeMedia: rel(d.beforeMedia), beforeAlt: String(d.beforeAlt || ''),
    after: String((d.afterMedia as any)?.url || d.after || ''), afterMedia: rel(d.afterMedia), afterAlt: String(d.afterAlt || ''),
    caption: String(d.caption || ''), consentDocumented: !!d.consentDocumented, consentDate: String(d.consentDate || ''),
    consentRecord: String(d.consentRecord || ''), unedited: !!d.unedited, consistentLighting: !!d.consistentLighting,
    published: !!d.published, order: Number(d.order || 0),
  }))
  return (
    <>
      <div className="pd-head"><div className="grow"><h1>Before &amp; After</h1><p className="pd-sub">Before and after photos for the treatment pages. Each treatment page shows its gallery only once it has a case that is ready.</p></div></div>
      <BeforeAfterEditor initial={rows} pages={pages} />
    </>
  )
}
