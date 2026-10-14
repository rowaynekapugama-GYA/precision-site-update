import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'

import { Users } from './cms/collections/Users'
import { Pages } from './cms/collections/Pages'
import { SharedBlocks } from './cms/collections/SharedBlocks'
import { Posts } from './cms/collections/Posts'
import { Team } from './cms/collections/Team'
import { Media } from './cms/collections/Media'
import { Enquiries } from './cms/collections/Enquiries'
import { Redirects } from './cms/collections/Redirects'
import { BeforeAfter } from './cms/collections/BeforeAfter'
import { Documents } from './cms/collections/Documents'
import { SiteSettings } from './cms/globals/SiteSettings'
import { SiteStatus } from './cms/globals/SiteStatus'
import { allowedOrigins, serverURL } from './cms/origins'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  routes: { admin: '/cms', api: '/api' },
  admin: {
    user: Users.slug,
    meta: { titleSuffix: ' | Precision Dental (GYA)' },
    avatar: 'default',
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [Pages, SharedBlocks, Posts, Team, BeforeAfter, Media, Documents, Enquiries, Redirects, Users],
  globals: [SiteSettings, SiteStatus],
  // Never a known value in production: without PAYLOAD_SECRET, sign-ins simply do not last.
  secret: process.env.PAYLOAD_SECRET ||
    (process.env.NODE_ENV !== 'production' ? 'local-development-only-secret' : crypto.randomBytes(32).toString('hex')),
  serverURL,
  cors: allowedOrigins(),
  csrf: allowedOrigins(),
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts'), autoGenerate: false },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || '' },
    push: false,
    migrationDir: path.resolve(dirname, '../migrations'),
  }),
  plugins: process.env.BLOB_READ_WRITE_TOKEN
    ? [vercelBlobStorage({ enabled: true, collections: { media: true, documents: true }, token: process.env.BLOB_READ_WRITE_TOKEN })]
    : [],
  sharp,
  telemetry: false,
})
