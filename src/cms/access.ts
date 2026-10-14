/** Who can do what. GYA staff are admins; practice staff are editors. */
import type { Access, FieldAccess, PayloadRequest } from 'payload'

type U = { id?: string | number; role?: string } | null | undefined

export const isAdminUser = (u: U): boolean => !!u && u.role === 'admin'

export const loggedIn: Access = ({ req }) => !!req.user
export const adminOnly: Access = ({ req }) => isAdminUser(req.user as U)
export const adminOrSelf: Access = ({ req }) => {
  const u = req.user as U
  if (!u) return false
  if (isAdminUser(u)) return true
  return { id: { equals: u.id } }
}
export const adminField: FieldAccess = ({ req }) => isAdminUser(req.user as U)

/** Payload's own admin (/cms) is for GYA only. */
export const cmsAdminAccess = ({ req }: { req: PayloadRequest }) => isAdminUser(req.user as U)
