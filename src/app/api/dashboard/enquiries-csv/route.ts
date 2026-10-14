/** Every enquiry as a CSV file that opens in Excel. */
import { routeUser } from '@/dashboard/lib/routeAuth'

export const dynamic = 'force-dynamic'

const cell = (v: unknown) => {
  const s = String(v ?? '').replace(/\r?\n/g, ' ')
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s   // stop Excel treating text as a formula
  return `"${safe.replace(/"/g, '""')}"`
}

export async function GET(req: Request) {
  const { payload, user } = await routeUser(req)
  if (!user) return new Response('Please sign in.', { status: 401 })
  const res = await payload.find({ collection: 'enquiries', limit: 100000, sort: '-createdAt', depth: 0, overrideAccess: true, pagination: false })
  const head = ['Received (Brisbane time)', 'Name', 'Phone', 'Email', 'Enquiring about', 'Message', 'Page', 'Email status', 'Followed up', 'Notes', 'Type', 'Lead source and campaign', 'SmileOx']
  const rows = res.docs.map((d) => [
    new Date(String(d.createdAt)).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' }),
    d.name, d.phone, d.email, d.service, d.message, d.page, d.emailStatus, d.followedUp ? 'Yes' : 'No', d.notes,
    d.kind === 'price-list' ? 'Price list download' : 'Enquiry', d.source, d.crmStatus,
  ].map(cell).join(','))
  const body = '﻿' + [head.map(cell).join(','), ...rows].join('\r\n') + '\r\n'
  const date = new Date().toISOString().slice(0, 10)
  return new Response(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="precision-dental-enquiries-${date}.csv"`,
      'cache-control': 'no-store',
    },
  })
}
