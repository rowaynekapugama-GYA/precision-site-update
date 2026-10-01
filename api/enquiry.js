// Enquiry form relay. Vercel serverless function (Node runtime).
// Sends through SMTP2GO. Set SMTP2GO_API_KEY in Vercel project settings.
// The from-address must sit on an SMTP2GO-verified domain.

const FROM = process.env.ENQUIRY_FROM || 'website@precisiondentistry.com.au';
const FALLBACK_RECIPIENTS = [
  'admin@precisiondentistry.com.au', // reception
  'rowayne@gyaclients.com'           // GYA
];

function esc(s = '') {
  return String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { name = '', phone = '', email = '', service = '', message = '' } = body;

  if (!name.trim() || !phone.trim() || !email.trim()) {
    return res.status(400).json({ error: 'Please add your name, phone and email.' });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Please check the email address.' });
  }

  const apiKey = process.env.SMTP2GO_API_KEY;
  if (!apiKey) {
    console.error('SMTP2GO_API_KEY is not set');
    return res.status(500).json({ error: 'The form is not configured yet. Please call (07) 3852 1160.' });
  }

  const extra = (process.env.ENQUIRY_RECIPIENTS || '').split(',').map(s => s.trim()).filter(Boolean);
  const to = [...new Set([...FALLBACK_RECIPIENTS, ...extra])];

  const html = `<h2>Website enquiry</h2>
<p><strong>Name:</strong> ${esc(name)}<br>
<strong>Phone:</strong> ${esc(phone)}<br>
<strong>Email:</strong> ${esc(email)}<br>
<strong>Enquiring about:</strong> ${esc(service)}</p>
<p><strong>Message</strong><br>${esc(message).replace(/\n/g, '<br>')}</p>
<hr><p style="color:#667">Sent from precisiondentistry.com.au</p>`;

  try {
    const r = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Smtp2go-Api-Key': apiKey },
      body: JSON.stringify({
        sender: `Precision Dental Website <${FROM}>`,
        to,
        reply_to: email,
        subject: `Website enquiry from ${name}`,
        html_body: html,
        text_body: `Website enquiry\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nEnquiring about: ${service}\n\n${message}`
      })
    });
    const data = await r.json();
    if (!r.ok || (data.data && data.data.succeeded === 0)) {
      console.error('SMTP2GO error', JSON.stringify(data));
      return res.status(502).json({ error: 'Sorry, that did not send. Please call (07) 3852 1160.' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Enquiry relay failed', err);
    return res.status(502).json({ error: 'Sorry, that did not send. Please call (07) 3852 1160.' });
  }
}
