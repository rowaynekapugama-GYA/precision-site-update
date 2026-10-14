/**
 * Create the first GYA administrator from SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.
 *
 * Runs on every build and only ever creates: if that email already has an account
 * nothing happens, so a password changed in the dashboard is never reset. The
 * account must choose a new password at first sign in. The password lives only in
 * the environment, never in the repo.
 */
import './load-env'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase()
const password = process.env.SEED_ADMIN_PASSWORD || ''
if (!email || !password) {
  console.log('seed-admin: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set, nothing to do')
  process.exit(0)
}
const payload = await getPayload({ config })
const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
if (found.docs.length) {
  console.log(`seed-admin: ${email} already exists, left unchanged`)
} else {
  await payload.create({
    collection: 'users',
    data: { email, password, name: 'Rowayne', role: 'admin', mustChangePassword: true },
    overrideAccess: true,
  })
  console.log(`seed-admin: created administrator ${email} (must change password at first sign in)`)
}
process.exit(0)
