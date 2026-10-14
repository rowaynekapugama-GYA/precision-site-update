import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { adminOnly, loggedIn } from '../access'
import { markChanged, markDeleted } from '../hooks'
import { todayBrisbane } from '../../render/util'

/** The sitemap date moves when a page is actually edited in the dashboard. */
const stampDate: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  if (operation !== 'update' || req.context?.skipDates || !originalDoc) return data
  const keys = ['model', 'seoTitle', 'seoDescription', 'ogImage', 'ogImageMedia', 'canonical', 'noindex']
  const changed = keys.some((k) => k in (data || {}) && JSON.stringify(data[k] ?? null) !== JSON.stringify(
    (originalDoc as Record<string, unknown>)[k] && typeof (originalDoc as Record<string, unknown>)[k] === 'object'
      ? ((originalDoc as Record<string, { id?: unknown }>)[k]?.id ?? null)
      : (originalDoc as Record<string, unknown>)[k] ?? null))
  if (changed) data.lastmod = todayBrisbane()
  return data
}

/**
 * One document per page of the site. The sections, their HTML templates and the
 * editable values are kept as JSON text in `model` (text, not jsonb, because
 * jsonb reorders keys and attribute order is part of byte parity).
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: { useAsTitle: 'label', defaultColumns: ['label', 'url', 'group', 'updatedAt'], group: 'Content' },
  access: { read: loggedIn, update: loggedIn, create: adminOnly, delete: adminOnly },
  hooks: { beforeChange: [stampDate], afterChange: [markChanged], afterDelete: [markDeleted] },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'label', type: 'text', required: true },
    { name: 'url', type: 'text' },
    { name: 'group', type: 'text' },
    { name: 'seoTitle', type: 'text', maxLength: 300 },
    { name: 'seoDescription', type: 'textarea', maxLength: 1000 },
    { name: 'ogImage', type: 'text' },
    { name: 'ogImageMedia', type: 'upload', relationTo: 'media' },
    { name: 'canonical', type: 'text' },
    { name: 'noindex', type: 'checkbox', defaultValue: false },
    { name: 'lastmod', type: 'text' },
    { name: 'model', type: 'textarea', required: true, maxLength: 5_000_000, admin: { readOnly: true } },
  ],
}
