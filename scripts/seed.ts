/**
 * Load the repo's content/ JSON into the database (the same as Import in the
 * dashboard). Keeps anything already there unless --overwrite is given.
 *   npm run seed            npm run seed -- --overwrite
 */
import './load-env'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { loadContent } from '../src/content/load'
import { importContent } from '../src/cms/sync'

const payload = await getPayload({ config })
const report = await importContent(payload, loadContent(), process.argv.includes('--overwrite'))
console.log(JSON.stringify(report))
process.exit(0)
