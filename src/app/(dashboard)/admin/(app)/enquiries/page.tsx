import { payloadClient, requireUser } from '@/dashboard/lib/server'
import { EnquiriesTable } from '@/dashboard/editors/Enquiries'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Enquiries' }

export default async function Enquiries() {
  await requireUser()
  const payload = await payloadClient()
  const res = await payload.find({ collection: 'enquiries', limit: 2000, sort: '-createdAt', depth: 0, overrideAccess: true })
  const rows = res.docs.map((d) => ({
    id: d.id, createdAt: String(d.createdAt), name: String(d.name || ''), phone: String(d.phone || ''), email: String(d.email || ''),
    service: String(d.service || ''), message: String(d.message || ''), page: String(d.page || ''), emailStatus: String(d.emailStatus || 'sent'),
    followedUp: !!d.followedUp, notes: String(d.notes || ''),
    kind: String(d.kind || 'enquiry'), source: String(d.source || ''), crmStatus: String(d.crmStatus || ''),
  }))
  return (
    <>
      <div className="pd-head"><div className="grow"><h1>Enquiries</h1><p className="pd-sub">Every message sent through the website&apos;s enquiry form, and every price list request, kept here as well as emailed to reception.</p></div></div>
      <EnquiriesTable initial={rows} />
    </>
  )
}
