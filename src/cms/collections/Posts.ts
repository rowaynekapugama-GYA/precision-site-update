import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { loggedIn } from '../access'
import { markChanged, markDeleted } from '../hooks'
import { slugify, todayBrisbane } from '../../render/util'
import { cleanPostBody } from '../sanitize'

const RESERVED = new Set(['admin', 'cms', 'api', 'assets', 'blog', 'service', 'our-team', 'sitemap', 'media', '_next', 'index', '404'])

/** A post lives at /<slug>/, so its address must not clash with a page or a system path. */
const checkSlug: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data || req.context?.skipDates) return data
  if (data.slug !== undefined) data.slug = slugify(String(data.slug))
  const slug = data.slug ?? originalDoc?.slug
  if (!slug) throw new APIError('Please give the post a web address.', 400, undefined, true)
  if (RESERVED.has(slug)) throw new APIError(`The address /${slug}/ is reserved. Please choose another.`, 400, undefined, true)
  const page = await req.payload.find({ collection: 'pages', where: { url: { equals: `/${slug}/` } }, limit: 1, depth: 0, overrideAccess: true, req })
  if (page.docs.length) throw new APIError(`The address /${slug}/ is already used by the page "${page.docs[0].label}". Please choose another.`, 400, undefined, true)
  const other = await req.payload.find({ collection: 'posts', where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true, req })
  if (other.docs.length && String(other.docs[0].id) !== String(originalDoc?.id ?? '')) {
    throw new APIError(`Another post already uses /${slug}/. Please choose another.`, 400, undefined, true)
  }
  return data
}

/** Clean the body of anything the editor should not produce, and keep old links working. */
const tidy: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  if (req.context?.skipDates) return data
  if (typeof data.body === 'string' && (operation === 'create' || data.body !== originalDoc?.body)) {
    data.body = cleanPostBody(data.body)
  }
  if (operation === 'update' && originalDoc?.status === 'published' && data.slug && data.slug !== originalDoc.slug) {
    try {
      await req.payload.create({
        collection: 'redirects',
        data: { from: `/${originalDoc.slug}/`, to: `/${data.slug}/`, permanent: true },
        overrideAccess: true, req,
      })
    } catch (err) {
      req.payload.logger.warn(`redirect for renamed post not created: ${(err as Error).message}`)
    }
  }
  return data
}

const CONTENT_KEYS = ['title', 'body', 'faq', 'excerpt', 'image', 'imageMedia', 'imageAlt', 'imageCaption',
  'categories', 'risk', 'seoTitle', 'seoDescription', 'published', 'status']

/** "Last updated" in the article schema and the sitemap follow real edits. */
const stampDates: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  if (req.context?.skipDates) return data
  const today = todayBrisbane()
  if (operation === 'create') {
    data.modified = data.modified || today
    data.lastmod = data.lastmod || data.published || today
    return data
  }
  const o = (originalDoc || {}) as Record<string, unknown>
  const norm = (v: unknown) => JSON.stringify(v && typeof v === 'object' && 'id' in (v as object) ? (v as { id: unknown }).id : v ?? null)
  const changed = CONTENT_KEYS.some((k) => k in (data || {}) && norm(data[k]) !== norm(o[k]))
  if (changed) {
    data.modified = today
    data.lastmod = today
  }
  return data
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'status', 'published', 'updatedAt'], group: 'Content' },
  access: { read: loggedIn, create: loggedIn, update: loggedIn, delete: loggedIn },
  hooks: { beforeValidate: [checkSlug], beforeChange: [tidy, stampDates], afterChange: [markChanged], afterDelete: [markDeleted] },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'draft',
      options: [{ label: 'Published', value: 'published' }, { label: 'Draft', value: 'draft' }],
    },
    { name: 'order', type: 'number' },
    { name: 'published', type: 'text', label: 'Publish date (YYYY-MM-DD)' },
    { name: 'modified', type: 'text' },
    { name: 'lastmod', type: 'text' },
    { name: 'author', type: 'text', defaultValue: 'Precision Dental' },
    { name: 'categories', type: 'json' },
    { name: 'readMinutes', type: 'number' },
    { name: 'excerpt', type: 'textarea', maxLength: 600 },
    { name: 'image', type: 'text' },
    { name: 'imageMedia', type: 'upload', relationTo: 'media' },
    { name: 'imageAlt', type: 'text', maxLength: 300 },
    { name: 'imageCaption', type: 'text', maxLength: 300 },
    { name: 'body', type: 'textarea', maxLength: 1_000_000 },
    { name: 'faq', type: 'json' },
    { name: 'risk', type: 'checkbox', defaultValue: false },
    { name: 'related', type: 'json' },
    { name: 'seoTitle', type: 'text', maxLength: 300 },
    { name: 'seoDescription', type: 'textarea', maxLength: 1000 },
    { name: 'ogImage', type: 'text' },
    { name: 'ogImageMedia', type: 'upload', relationTo: 'media' },
    { name: 'canonical', type: 'text' },
    { name: 'noindex', type: 'checkbox', defaultValue: false },
  ],
}
