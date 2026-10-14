import type { CollectionConfig } from 'payload'
import { loggedIn } from '../access'
import { markChanged, markDeleted } from '../hooks'

/**
 * Before and after cases for the treatment pages. A case appears on the website
 * only when it is published AND consent is documented AND the photos are
 * unedited AND taken in consistent lighting (AHPRA advertising guidelines).
 */
export const BeforeAfter: CollectionConfig = {
  slug: 'before-after',
  labels: { singular: 'Before and after case', plural: 'Before & After' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'page', 'published', 'order'], group: 'Content' },
  access: { read: loggedIn, create: loggedIn, update: loggedIn, delete: loggedIn },
  hooks: { afterChange: [markChanged], afterDelete: [markDeleted] },
  defaultSort: 'order',
  fields: [
    { name: 'ref', type: 'text', index: true, admin: { readOnly: true } },
    { name: 'title', type: 'text', required: true },
    { name: 'page', type: 'text', required: true },
    { name: 'before', type: 'text' },
    { name: 'beforeMedia', type: 'upload', relationTo: 'media' },
    { name: 'beforeAlt', type: 'text' },
    { name: 'after', type: 'text' },
    { name: 'afterMedia', type: 'upload', relationTo: 'media' },
    { name: 'afterAlt', type: 'text' },
    { name: 'caption', type: 'textarea' },
    { name: 'consentDocumented', type: 'checkbox', defaultValue: false },
    { name: 'consentDate', type: 'text' },
    { name: 'consentRecord', type: 'text' },
    { name: 'unedited', type: 'checkbox', defaultValue: false },
    { name: 'consistentLighting', type: 'checkbox', defaultValue: false },
    { name: 'published', type: 'checkbox', defaultValue: false },
    { name: 'order', type: 'number' },
  ],
}
