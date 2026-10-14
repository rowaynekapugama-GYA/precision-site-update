import type { CollectionConfig } from 'payload'
import { adminField, adminOnly, adminOrSelf, isAdminUser, loggedIn } from '../access'

/**
 * Two roles. admin = GYA, editor = practice staff. Nobody can register: accounts
 * are created by an admin from the dashboard's Users screen, or by the seed step
 * from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD on the first deploy.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email', defaultColumns: ['name', 'email', 'role'], group: 'Admin' },
  auth: {
    tokenExpiration: 60 * 60 * 12,
    maxLoginAttempts: 8,
    lockTime: 15 * 60 * 1000,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
  },
  access: {
    admin: ({ req }) => isAdminUser(req.user as { role?: string }),
    read: adminOrSelf,
    create: adminOnly,
    update: adminOrSelf,
    delete: adminOnly,
    unlock: adminOnly,
  },
  hooks: {
    beforeOperation: [
      ({ operation, req }) => {
        // the public "create first user" route is closed unless switched on for setup
        if (operation === 'create' && req.payloadAPI !== 'local' && !isAdminUser(req.user as { role?: string })
          && process.env.ALLOW_FIRST_USER !== 'true') {
          throw new Error('Only an administrator can add users.')
        }
      },
    ],
    beforeChange: [
      ({ data, originalDoc, operation, req }) => {
        // an admin setting a password for someone else makes it temporary
        if (operation === 'update' && data?.password && req.user && originalDoc
          && String((req.user as { id?: unknown }).id) !== String(originalDoc.id)) {
          data.mustChangePassword = true
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', label: 'Name' },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Administrator (GYA)', value: 'admin' },
        { label: 'Editor (practice)', value: 'editor' },
      ],
      access: { create: adminField, update: adminField },
      saveToJWT: true,
    },
    {
      name: 'mustChangePassword',
      type: 'checkbox',
      defaultValue: true,
      label: 'Must choose a new password at next sign in',
      access: { update: adminField },
      saveToJWT: true,
    },
  ],
}
