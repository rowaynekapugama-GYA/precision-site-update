import { payloadClient, requireUser } from '@/dashboard/lib/server'
import { Shell } from '@/dashboard/ui/Shell'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser()
  const payload = await payloadClient()
  const open = await payload.count({ collection: 'enquiries', where: { followedUp: { equals: false } }, overrideAccess: true })
  return <Shell user={{ name: u.name, email: u.email, role: u.role }} newEnquiries={open.totalDocs}>{children}</Shell>
}
