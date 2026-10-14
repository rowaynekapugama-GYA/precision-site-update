/**
 * Import: load the content committed in the repo into the dashboard's database.
 * Safe to run again (keeps what is already there); ?overwrite=1 resets to the repo.
 * Administrators only.
 */
import { json, routeUser } from '@/dashboard/lib/routeAuth'
import { loadContent } from '@/content/load'
import { importContent } from '@/cms/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: Request) {
  const { payload, user } = await routeUser(req)
  if (!user || user.role !== 'admin') return json(403, { error: 'Only GYA administrators can import.' })
  const overwrite = new URL(req.url).searchParams.get('overwrite') === '1'
  try {
    const report = await importContent(payload, loadContent(), overwrite)
    const made = Object.values(report).reduce((n, r) => n + r.created + r.updated, 0)
    await payload.updateGlobal({ slug: 'site-status', data: { lastChangedAt: new Date().toISOString() }, overrideAccess: true, context: { skipStatus: true } }).catch(() => {})
    return json(200, { ok: true, report, message: overwrite ? `Reset done: ${made} items loaded from the code.` : made ? `Import done: ${made} items loaded.` : 'Nothing new to import. Everything is already in the dashboard.' })
  } catch (err) {
    return json(500, { error: `Import failed: ${(err as Error).message}` })
  }
}
