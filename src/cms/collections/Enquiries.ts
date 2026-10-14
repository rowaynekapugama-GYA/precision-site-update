import type { CollectionConfig } from 'payload'
import { adminOnly, loggedIn } from '../access'

/** Every form submission, kept even if the email does not arrive. */
export const Enquiries: CollectionConfig = {
  slug: 'enquiries',
  admin: { useAsTitle: 'name', defaultColumns: ['createdAt', 'name', 'phone', 'service', 'emailStatus'], group: 'Enquiries' },
  access: { read: loggedIn, create: () => false, update: loggedIn, delete: adminOnly },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'kind', type: 'select', defaultValue: 'enquiry',
      options: [{ label: 'Enquiry', value: 'enquiry' }, { label: 'Price list download', value: 'price-list' }],
    },
    { name: 'name', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'email', type: 'text' },
    { name: 'service', type: 'text' },
    { name: 'message', type: 'textarea' },
    { name: 'page', type: 'text' },
    { name: 'source', type: 'textarea' },
    { name: 'consentAt', type: 'date' },
    { name: 'crmStatus', type: 'text' },
    {
      name: 'emailStatus', type: 'select', defaultValue: 'sent',
      options: [
        { label: 'Emailed', value: 'sent' },
        { label: 'Email failed', value: 'failed' },
        { label: 'Email not set up', value: 'not-configured' },
      ],
    },
    { name: 'followedUp', type: 'checkbox', defaultValue: false },
    { name: 'notes', type: 'textarea' },
  ],
}
