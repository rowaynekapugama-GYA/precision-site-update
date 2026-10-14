/** Save a form submission to the dashboard. Never throws: the email matters more. */
import { getPayload } from 'payload'
import config from '@payload-config'

export async function logEnquiry(data: {
  name: string; phone: string; email: string; service: string; message: string; page: string
  emailStatus: 'sent' | 'failed' | 'not-configured'
  kind?: 'enquiry' | 'price-list'; source?: string; consentAt?: string; crmStatus?: string
}): Promise<void> {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) return
  try {
    const payload = await getPayload({ config })
    await payload.create({ collection: 'enquiries', data, overrideAccess: true })
  } catch (err) {
    console.error('Enquiry not saved to the dashboard', (err as Error).message)
  }
}
