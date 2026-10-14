/**
 * Publish website: ask Vercel to rebuild. The build pulls everything saved in the
 * dashboard into the site's files and puts it live (about two minutes).
 */
import { json, routeUser } from '@/dashboard/lib/routeAuth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { payload, user } = await routeUser(req)
  if (!user) return json(401, { error: 'Please sign in again.' })
  if (user.mustChangePassword) return json(403, { error: 'Please choose your own password first.' })
  const hook = process.env.PUBLISH_HOOK_URL
  if (!hook) {
    return json(200, { ok: false, message: 'Publishing is not set up yet: GYA needs to add the publish hook. Your changes are saved.' })
  }
  let ok = false
  let detail = ''
  try {
    const r = await fetch(hook, { method: 'POST' })
    ok = r.ok
    detail = `${r.status}`
  } catch (err) {
    detail = (err as Error).message
  }
  try {
    await payload.updateGlobal({
      slug: 'site-status',
      data: ok
        ? { lastPublishedAt: new Date().toISOString(), lastPublishedBy: String(user.name || user.email), lastPublishResult: `started (${detail})` }
        : { lastPublishResult: `failed (${detail})` },
      overrideAccess: true,
      context: { skipStatus: true },
    })
  } catch { /* status is best effort */ }
  return ok
    ? json(200, { ok: true, message: 'Publishing started. The website updates in about two minutes.' })
    : json(502, { error: 'Vercel did not accept the publish request. Please try again in a minute, or contact GYA.' })
}
