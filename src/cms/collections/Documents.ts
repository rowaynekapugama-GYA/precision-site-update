import type { CollectionConfig } from 'payload'
import { loggedIn } from '../access'
import { markChanged, markDeleted } from '../hooks'

/**
 * PDFs for the website, at the moment just the price list. Readable by anyone
 * with the link (it is emailed to people who ask for it); never linked from the
 * public pages, so the price list stays behind its form.
 */
export const Documents: CollectionConfig = {
  slug: 'documents',
  admin: { useAsTitle: 'filename', group: 'Content' },
  access: { read: () => true, create: loggedIn, update: loggedIn, delete: loggedIn },
  hooks: { afterChange: [markChanged], afterDelete: [markDeleted] },
  upload: {
    staticDir: 'media-documents',
    mimeTypes: ['application/pdf'],
  },
  fields: [
    { name: 'title', type: 'text' },
  ],
}
