/**
 * Enquiry form relay, moved from the old api/enquiry.js serverless function with
 * the same behaviour: same checks, same SMTP2GO call, same recipients, same
 * replies to the visitor. New: every submission is also saved to the dashboard's
 * Enquiries list (best effort, after the email), so a lead is never lost to a
 * mail problem.
 */
import { logEnquiry } from '@/lib/enquiries'

export const dynamic = 'force-dynamic'

const FROM = process.env.ENQUIRY_FROM || 'website@precisiondentistry.com.au'
const FALLBACK_RECIPIENTS = [
  'admin@precisiondentistry.com.au', // reception
  'rowayne@gyaclients.com',          // GYA
]

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

export async function POST(req: Request) {
  let body: Record<string, string> = {}
  try {
    const raw = await req.text()
    body = raw ? JSON.parse(raw) : {}
  } catch {
    body = {}
  }
  const name = String(body.name ?? '')
  const phone = String(body.phone ?? '')
  const email = String(body.email ?? '')
  const service = String(body.service ?? '')
  const message = String(body.message ?? '')

  if (!name.trim() || !phone.trim() || !email.trim()) {
    return json(400, { error: 'Please add your name, phone and email.' })
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json(400, { error: 'Please check the email address.' })
  }

  let page = ''
  try { page = new URL(req.headers.get('referer') || '').pathname } catch { /* no referrer */ }
  const record = { name, phone, email, service, message, page }

  const apiKey = process.env.SMTP2GO_API_KEY
  if (!apiKey) {
    console.error('SMTP2GO_API_KEY is not set')
    await logEnquiry({ ...record, emailStatus: 'not-configured' })
    return json(500, { error: 'The form is not configured yet. Please call (07) 3852 1160.' })
  }

  // the SmileOx intake address (when set) gets every enquiry, as on our other builds
  const extra = [process.env.SMILEOX_INTAKE_EMAIL || '', ...(process.env.ENQUIRY_RECIPIENTS || '').split(',')]
    .map((s) => s.trim()).filter(Boolean)
  const to = [...new Set([...FALLBACK_RECIPIENTS, ...extra])]

  const html = `<h2>Website enquiry</h2>
<p><strong>Name:</strong> ${esc(name)}<br>
<strong>Phone:</strong> ${esc(phone)}<br>
<strong>Email:</strong> ${esc(email)}<br>
<strong>Enquiring about:</strong> ${esc(service)}</p>
<p><strong>Message</strong><br>${esc(message).replace(/\n/g, '<br>')}</p>
<hr><p style="color:#667">Sent from precisiondentistry.com.au</p>`

  try {
    const r = await fetch(process.env.SMTP2GO_ENDPOINT || 'https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Smtp2go-Api-Key': apiKey },
      body: JSON.stringify({
        sender: `Precision Dental Website <${FROM}>`,
        to,
        reply_to: email,
        subject: `Website enquiry from ${name}`,
        html_body: html,
        text_body: `Website enquiry\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nEnquiring about: ${service}\n\n${message}`,
      }),
    })
    const data = await r.json()
    if (!r.ok || (data.data && data.data.succeeded === 0)) {
      console.error('SMTP2GO error', JSON.stringify(data))
      await logEnquiry({ ...record, emailStatus: 'failed' })
      return json(502, { error: 'Sorry, that did not send. Please call (07) 3852 1160.' })
    }
    await logEnquiry({ ...record, emailStatus: 'sent' })
    return json(200, { ok: true })
  } catch (err) {
    console.error('Enquiry relay failed', err)
    await logEnquiry({ ...record, emailStatus: 'failed' })
    return json(502, { error: 'Sorry, that did not send. Please call (07) 3852 1160.' })
  }
}
