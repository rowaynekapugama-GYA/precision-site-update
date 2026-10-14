import type { CollectionConfig } from 'payload'
import { loggedIn } from '../access'
import { markChanged, markDeleted } from '../hooks'

/** Meet the Team cards. Names and credentials come from the practice, never invented. */
export const Team: CollectionConfig = {
  slug: 'team',
  labels: { singular: 'Team member', plural: 'Team' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'role', 'hidden', 'order'], group: 'Content' },
  access: { read: loggedIn, create: loggedIn, update: loggedIn, delete: loggedIn },
  hooks: { afterChange: [markChanged], afterDelete: [markDeleted] },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'role', type: 'text' },
    { name: 'qualifications', type: 'text' },
    { name: 'photo', type: 'text' },
    { name: 'photoMedia', type: 'upload', relationTo: 'media' },
    { name: 'photoAlt', type: 'text' },
    { name: 'bio', type: 'textarea', maxLength: 20000 },
    { name: 'profileUrl', type: 'text' },
    { name: 'profileLinkText', type: 'text' },
    { name: 'hidden', type: 'checkbox', defaultValue: false },
    { name: 'order', type: 'number' },
    { name: 'registrationType', type: 'text' },
    { name: 'registrationNumber', type: 'text' },
  ],
}
