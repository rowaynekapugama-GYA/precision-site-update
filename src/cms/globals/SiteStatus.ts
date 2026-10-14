import type { GlobalConfig } from 'payload'
import { loggedIn } from '../access'

/** When content last changed and when the website was last published. */
export const SiteStatus: GlobalConfig = {
  slug: 'site-status',
  admin: { hidden: true },
  access: { read: loggedIn, update: () => false },
  fields: [
    { name: 'lastChangedAt', type: 'date' },
    { name: 'lastPublishedAt', type: 'date' },
    { name: 'lastPublishedBy', type: 'text' },
    { name: 'lastPublishResult', type: 'text' },
    { name: 'appliedUpdates', type: 'text' },
  ],
}
