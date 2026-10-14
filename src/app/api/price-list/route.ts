/**
 * The gated price list (14 October 2026).
 *
 * A visitor gives first name, last name, email and mobile and ticks the consent box.
 * The lead then goes to SmileOx, tagged "Price List Download" with its lead source and
 * campaign details, and SmileOx's automation emails the price list:
 *
 *   - always: an email to the SmileOx intake address (SMILEOX_INTAKE_EMAIL), reception
 *     and GYA through SMTP2GO, laid out one "Label: value" per line so SmileOx can map it
 *   - when SMILEOX_WEBHOOK_URL is set: the same lead as JSON to SmileOx's webhook
 *     (Authorization: Bearer SMILEOX_WEBHOOK_SECRET when that is set)
 *   - only when Site Settings says the website sends the price list itself: an email
 *     to the visitor with a link to the PDF
 *
 * Every submission is also saved to the dashboard's Enquiries list.
 */
import { logEnquiry } from '@/lib/enquiries'
import leadConfig from '@/generated/lead-config.json'
import { leadSource, normaliseMobile, ATTR_KEYS, type Attr } from '@/lib/leads'

export const dynamic = 'force-dynamic'

const FROM = process.env.ENQUIRY_FROM || 'website@precisiondentistry.com.au'
const FALLBACK_RECIPIENTS = [
  'admin@precisiondentistry.com.au', // reception
  'rowayne@gyaclients.com',          // GYA
]
const TAG = 'Price List Download'
const PHONE = leadConfig.phone || '(07) 3852 1160'

function esc(s = '') {
  return String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string))
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export async function GET() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405, headers: { Allow: 'POST', 'content-type': 'application/json' },
  })
}

const clean = (v: unknown, max = 200) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max)

async function smtp2go(apiKey: string, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const r = await fetch(process.env.SMTP2GO_ENDPOINT || 'https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Smtp2go-Api-Key': apiKey },
      body: JSON.stringify({ sender: `Precision Dental Website <${FROM}>`, ...payload }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok || (data?.data && data.data.succeeded === 0)) {
      console.error('SMTP2GO error', JSON.stringify(data))
      return false
    }
    return true
  } catch (err) {
    console.error('SMTP2GO request failed', err)
    return false
  }
}

export async function POST(req: Request) {
  let body: Record<string, any> = {}
  try {
    const raw = await req.text()
    body = raw ? JSON.parse(raw) : {}
  } catch {
    body = {}
  }
  // the hidden "company" box is only ever filled in by bots: say thanks and drop it
  if (clean(body.company)) return json(200, { ok: true })

  const firstName = clean(body.firstName, 80)
  const lastName = clean(body.lastName, 80)
  const email = clean(body.email, 160)
  const mobile = normaliseMobile(clean(body.mobile, 30))
  if (!firstName || !lastName || !email || !clean(body.mobile)) return json(400, { error: 'Please add your first name, last name, email and mobile.' })
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { error: 'Please check the email address.' })
  if (!mobile) return json(400, { error: 'Please check your mobile number, for example 0412 345 678.' })
  if (body.consent !== true) return json(400, { error: 'Please tick the box to agree to us emailing you the price list.' })

  const a: Attr = {}
  const rawAttr = body.attribution && typeof body.attribution === 'object' ? body.attribution : {}
  for (const k of ATTR_KEYS) if (rawAttr[k]) a[k] = clean(rawAttr[k])
  let page = clean(body.page, 200)
  if (!page) { try { page = new URL(req.headers.get('referer') || '').pathname } catch { /* none */ } }
  const formLocation = clean(body.formLocation, 40)
  const source = leadSource(a)
  const consentAt = new Date().toISOString()
  const name = `${firstName} ${lastName}`

  const rows: [string, string][] = [
    ['First name', firstName], ['Last name', lastName], ['Email', email], ['Mobile', mobile],
    ['Tag', TAG], ['Lead source', source], ['Form', `Price list (${formLocation || 'website'})`], ['Page', page],
    ...ATTR_KEYS.filter((k) => a[k]).map((k) => [k, a[k] as string] as [string, string]),
    ['Consent', `Agreed to receive the price list by email and to be contacted about the enquiry (${consentAt})`],
  ]
  const sourceText = rows.slice(5).map(([k, v]) => `${k}: ${v}`).join('\n')
  const record = {
    kind: 'price-list' as const, name, phone: mobile, email, service: 'Price list download', message: '',
    page, source: sourceText, consentAt,
  }

  const apiKey = process.env.SMTP2GO_API_KEY
  const intake = (process.env.SMILEOX_INTAKE_EMAIL || '').trim()
  const webhook = (process.env.SMILEOX_WEBHOOK_URL || '').trim()
  const crm: string[] = []

  // 1. the SmileOx webhook, when SmileOx has given us one
  let webhookOk = false
  if (webhook) {
    try {
      const ctl = new AbortController()
      const t = setTimeout(() => ctl.abort(), 8000)
      const r = await fetch(webhook, {
        method: 'POST',
        signal: ctl.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.SMILEOX_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.SMILEOX_WEBHOOK_SECRET}` } : {}),
        },
        body: JSON.stringify({
          firstName, lastName, email, mobile, tags: [TAG], leadSource: source, form: 'price-list', formLocation, page,
          utm: Object.fromEntries(ATTR_KEYS.filter((k) => a[k]).map((k) => [k, a[k]])),
          consent: true, consentAt, practice: 'Precision Dental',
        }),
      })
      clearTimeout(t)
      webhookOk = r.ok
      crm.push(r.ok ? 'SmileOx webhook: received' : `SmileOx webhook: failed (${r.status})`)
    } catch (err) {
      crm.push(`SmileOx webhook: failed (${(err as Error).name})`)
    }
  }

  // 2. the lead by email to the SmileOx intake address, reception and GYA
  if (!apiKey) {
    console.error('SMTP2GO_API_KEY is not set')
    await logEnquiry({ ...record, emailStatus: 'not-configured', crmStatus: crm.join('; ') || 'SmileOx: not sent (email not set up)' })
    return webhookOk ? json(200, { ok: true }) : json(500, { error: `The form is not set up yet. Please call ${PHONE}.` })
  }
  const extra = [intake, ...(process.env.PRICE_LIST_RECIPIENTS || process.env.ENQUIRY_RECIPIENTS || '').split(',')]
    .map((s) => s.trim()).filter(Boolean)
  const to = [...new Set([...FALLBACK_RECIPIENTS, ...extra])]
  const html = `<h2>Price list download</h2>\n<p>${rows.map(([k, v]) => `<strong>${esc(k)}:</strong> ${esc(v)}`).join('<br>\n')}</p>\n` +
    `<hr><p style="color:#667">Sent from precisiondentistry.com.au. SmileOx: tag this contact "${TAG}".</p>`
  const sent = await smtp2go(apiKey, {
    to, reply_to: email, subject: `${TAG}: ${name}`, html_body: html,
    text_body: `Price list download\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n`,
  })
  crm.push(intake ? (sent ? 'SmileOx intake email: sent' : 'SmileOx intake email: failed') : 'SmileOx intake address not set')

  // 3. the price list itself, only when the website (not SmileOx) is set to send it
  const file = leadConfig.priceList?.file || ''
  if (sent && leadConfig.priceList?.delivery === 'website' && file) {
    const ok = await smtp2go(apiKey, {
      to: [email], subject: 'Your Precision Dental price list',
      html_body: `<p>Hi ${esc(firstName)},</p><p>Thank you for your interest in Precision Dental. You can download our price list here:</p>` +
        `<p><a href="${esc(file)}">Download the Precision Dental price list (PDF)</a></p>` +
        `<p>Every mouth is different, so the cost of your treatment depends on your needs. After your examination we will give you a written treatment plan and quote.</p>` +
        `<p>If you have any questions, call us on ${esc(PHONE)}.</p><p>Precision Dental<br>Fortitude Valley</p>`,
      text_body: `Hi ${firstName},\n\nThank you for your interest in Precision Dental. You can download our price list here:\n${file}\n\nIf you have any questions, call us on ${PHONE}.\n\nPrecision Dental, Fortitude Valley\n`,
    })
    crm.push(ok ? 'Price list emailed by the website' : 'Price list email from the website failed')
  }

  await logEnquiry({ ...record, emailStatus: sent ? 'sent' : 'failed', crmStatus: crm.join('; ') })
  if (!sent && !webhookOk) return json(502, { error: `Sorry, that did not send. Please call ${PHONE} and we will send you the price list.` })
  return json(200, { ok: true })
}
