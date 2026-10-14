import type { CollectionConfig } from 'payload'
import { loggedIn } from '../access'
import { markChanged, markDeleted } from '../hooks'

/**
 * Photos uploaded in the dashboard. Every upload is resized to fit 2400px and
 * saved as WebP, plus a 1200x630 JPEG for social sharing. In production the files
 * live in Vercel Blob; locally they go to ./media.
 *
 * Anyone can read (view) them: they are the website's own photos, and the public
 * pages link to /api/media/file/... which Payload only serves to those with read
 * access. (Before v3.1.0 this was signed-in only, so a photo uploaded in the
 * dashboard showed to staff but not to visitors.) Changing them still needs a sign-in.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  admin: { useAsTitle: 'filename', group: 'Content' },
  access: { read: () => true, create: loggedIn, update: loggedIn, delete: loggedIn },
  hooks: { afterChange: [markChanged], afterDelete: [markDeleted] },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
    resizeOptions: { width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true },
    formatOptions: { format: 'webp', options: { quality: 82 } },
    imageSizes: [
      { name: 'og', width: 1200, height: 630, position: 'centre', formatOptions: { format: 'jpeg', options: { quality: 82 } } },
      { name: 'thumb', width: 480, height: 480, fit: 'inside', withoutEnlargement: true, formatOptions: { format: 'webp', options: { quality: 75 } } },
    ],
    adminThumbnail: 'thumb',
  },
  fields: [
    { name: 'alt', type: 'text', label: 'Default description (alt text)', maxLength: 300 },
  ],
}
