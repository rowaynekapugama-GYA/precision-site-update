import type { CollectionConfig } from 'payload'
import { adminOnly, loggedIn } from '../access'
import { markChanged } from '../hooks'

/** Sections that are the same on many pages, such as the Book Your Visit band. */
export const SharedBlocks: CollectionConfig = {
  slug: 'shared-blocks',
  admin: { useAsTitle: 'label', group: 'Content' },
  access: { read: loggedIn, update: loggedIn, create: adminOnly, delete: adminOnly },
  hooks: { afterChange: [markChanged] },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true },
    { name: 'label', type: 'text', required: true },
    { name: 'model', type: 'textarea', required: true, maxLength: 2_000_000, admin: { readOnly: true } },
  ],
}
