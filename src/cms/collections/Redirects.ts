import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access'
import { markChanged, markDeleted } from '../hooks'

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  admin: { useAsTitle: 'from', group: 'Admin' },
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  hooks: { afterChange: [markChanged], afterDelete: [markDeleted] },
  fields: [
    { name: 'from', type: 'text', required: true, unique: true },
    { name: 'to', type: 'text', required: true },
    { name: 'permanent', type: 'checkbox', defaultValue: true },
  ],
}
