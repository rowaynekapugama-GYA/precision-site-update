/**
 * Bookkeeping that runs whenever content changes in the dashboard.
 *
 * site-status.lastChangedAt drives the "changes waiting to publish" notice. It is
 * best effort: a failure here must never stop a save, and the seed and import
 * scripts run outside a request, where some of this would throw.
 */
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook, PayloadRequest } from 'payload'

async function touch(req: PayloadRequest) {
  if (req.context?.skipStatus) return
  try {
    await req.payload.updateGlobal({
      slug: 'site-status',
      data: { lastChangedAt: new Date().toISOString() },
      req,
      context: { skipStatus: true },
    })
  } catch (err) {
    req.payload.logger.warn(`site-status not updated: ${(err as Error).message}`)
  }
}

export const markChanged: CollectionAfterChangeHook = async ({ req }) => {
  await touch(req)
}
export const markDeleted: CollectionAfterDeleteHook = async ({ req }) => {
  await touch(req)
}
export const markGlobalChanged: GlobalAfterChangeHook = async ({ req }) => {
  await touch(req)
}
