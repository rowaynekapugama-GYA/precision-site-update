import { payloadClient, requireUser } from '@/dashboard/lib/server'
import { TeamEditor } from '@/dashboard/editors/TeamEditor'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Team' }

export default async function Team() {
  await requireUser()
  const payload = await payloadClient()
  const res = await payload.find({ collection: 'team', limit: 200, sort: 'order', depth: 0, overrideAccess: true })
  const team = res.docs.map((d) => ({
    id: d.id, name: String(d.name || ''), role: String(d.role || ''), qualifications: String(d.qualifications || ''),
    photo: String(d.photo || ''), photoMedia: (d.photoMedia && typeof d.photoMedia === 'object' ? (d.photoMedia as { id: number }).id : (d.photoMedia as number)) ?? null,
    photoAlt: String(d.photoAlt || ''), bio: String(d.bio || ''), profileUrl: String(d.profileUrl || ''), profileLinkText: String(d.profileLinkText || ''),
    hidden: !!d.hidden, order: Number(d.order || 0),
    registrationType: String(d.registrationType || ''), registrationNumber: String(d.registrationNumber || ''),
  }))
  return (
    <>
      <div className="pd-head"><div className="grow"><h1>Team</h1><p className="pd-sub">The people on the Meet the Team page. Drag to reorder, open a person to edit, or hide someone without deleting them.</p></div></div>
      <TeamEditor initial={team} />
    </>
  )
}
