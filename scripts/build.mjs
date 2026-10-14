/**
 * The Vercel build (npm run build).
 *
 *   1. with a database: run migrations, create the first admin if asked to, apply
 *      this release's content updates once, and pull the dashboard's content into content/
 *   2. render the public site from content/ into public/
 *   3. next build (the dashboard, Payload at /cms, the API routes)
 *
 * Without DATABASE_URL, or with an empty or unreachable database, step 1 is
 * skipped and the site is built from the JSON committed in the repo.
 */
import { spawnSync } from 'node:child_process'

const hasDb = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL)
const env = { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, '--no-deprecation'].filter(Boolean).join(' ') }

function run(label, cmd, args, { optional = false } = {}) {
  console.log(`\n> ${label}`)
  const r = spawnSync(cmd, args, { stdio: 'inherit', env, shell: false })
  if (r.status !== 0) {
    if (optional) {
      console.warn(`! ${label} did not finish; carrying on with the JSON in the repo`)
      return false
    }
    console.error(`x ${label} failed`)
    process.exit(r.status ?? 1)
  }
  return true
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

if (hasDb) {
  const migrated = run('database migrations', npx, ['payload', 'migrate', '--force-accept-warning'], { optional: true })
  if (migrated) {
    run('first administrator', npx, ['tsx', 'scripts/seed-admin.ts'], { optional: true })
    run('content updates in this release', npx, ['tsx', 'scripts/content-updates.ts'], { optional: true })
    run('pull dashboard content', npx, ['tsx', 'scripts/pull-content.ts'], { optional: true })
  }
} else {
  console.log('\n> no DATABASE_URL: building from the JSON in the repo')
}
run('render the public site', npx, ['tsx', 'scripts/render-site.ts'])
run('next build', npx, ['next', 'build'])
