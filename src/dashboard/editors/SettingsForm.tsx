'use client'
/** Practice details, hours, links, logo, colours, SEO defaults, tracking and site features in one place. */
import React, { useState } from 'react'
import type { HoursDay, Settings } from '../../render/types'
import { hoursSummary, phoneIntl } from '../../render/settings'
import { api, mediaSrc, uploadDocument } from '../lib/client'
import { Notice, Select, TextArea, TextInput, Toggle, useUnsavedWarning } from '../ui/fields'
import { ImageSlot } from '../ui/MediaPicker'
import { PublishButton } from '../ui/PublishButton'
import { useToast } from '../ui/Toast'
import { Icon } from '../ui/icons'

type S = Settings & { logoMedia?: number | string | null }

const ORIGINAL_COLOURS = { navy: '#012A41', blue: '#1A9AD4', blueDark: '#0A6E9E' }

function Panel({ id, title, intro, children }: { id: string; title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel" id={id}>
      <h2>{title}</h2>
      {intro ? <p className="help" style={{ marginTop: -6, marginBottom: 14 }}>{intro}</p> : null}
      {children}
    </section>
  )
}

export function SettingsForm({ initial, isAdmin }: { initial: S; isAdmin: boolean }) {
  const toast = useToast()
  const [s, setS] = useState<S>(initial)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [geo, setGeo] = useState({ lat: String(initial.address.latitude), lng: String(initial.address.longitude) })
  useUnsavedWarning(dirty)
  const set = (patch: Partial<S>) => { setS((x) => ({ ...x, ...patch })); setDirty(true) }
  const setA = (patch: Partial<S['address']>) => set({ address: { ...s.address, ...patch } })
  const setH = (i: number, patch: Partial<HoursDay>) => set({ hours: s.hours.map((h, n) => (n === i ? { ...h, ...patch } : h)) })
  const setSoc = (patch: Partial<S['socials']>) => set({ socials: { ...s.socials, ...patch } })
  const setCol = (patch: Partial<S['colours']>) => set({ colours: { ...s.colours, ...patch } })
  const setF = (patch: Partial<S['features']>) => set({ features: { ...s.features, ...patch } })
  const setT = (patch: Partial<S['tracking']>) => set({ tracking: { ...s.tracking, ...patch } })
  const setSeo = (patch: Partial<S['seoDefaults']>) => set({ seoDefaults: { ...s.seoDefaults, ...patch } })
  const setO = (patch: Partial<S['offer']>) => set({ offer: { ...s.offer, ...patch } })
  const setR = (patch: Partial<S['reviews']>) => set({ reviews: { ...s.reviews, ...patch } })
  const setP = (patch: Partial<S['priceList']>) => set({ priceList: { ...s.priceList, ...patch } })
  const setSc = (patch: Partial<S['schemes']>) => set({ schemes: { ...s.schemes, ...patch } })
  const [pdfBusy, setPdfBusy] = useState(false)
  const URGENT = /\b(hurry|limited time|don['’]?t miss|ends soon|last chance|act now|today only|while stocks last|only \d+ (spots|places))\b/i // qa:allow: the urgency words the form refuses
  const rating = Number(String(s.reviews.rating || '').replace(',', '.'))

  async function uploadPdf(f?: File) {
    if (!f) return
    if (f.type !== 'application/pdf') { toast('Please choose a PDF file.', 'bad'); return }
    setPdfBusy(true)
    try {
      const d = await uploadDocument(f, 'Price list')
      setP({ file: mediaSrc(d), fileDoc: d.id })
      toast('Price list uploaded. Save settings to keep it.', 'good')
    } catch (e) {
      toast((e as Error).message, 'bad')
    } finally {
      setPdfBusy(false)
    }
  }

  async function save() {
    if (!s.phone.trim()) { toast('The phone number cannot be empty.', 'bad'); return }
    if (s.bookingUrl && !/^https?:\/\//.test(s.bookingUrl.trim())) { toast('The booking link must start with https://', 'bad'); return }
    for (const h of s.hours) {
      if (h.open && (!/^\d{2}:\d{2}$/.test(h.opens) || !/^\d{2}:\d{2}$/.test(h.closes))) { toast(`Please set opening and closing times for ${h.day}.`, 'bad'); return }
    }
    if (s.offer.enabled) {
      if (!/^\$?\d+(\.\d{2})?$/.test(String(s.offer.price).trim())) { toast('The offer needs its exact price, numbers only, for example 229.', 'bad'); return }
      if (!s.offer.inclusions.trim()) { toast('List what the offer includes, one item per line.', 'bad'); return }
    }
    if ([s.offer.title, s.offer.inclusions, s.offer.period, s.offer.termsLine, s.offer.bookLabel].some((t) => URGENT.test(t || ''))) {
      toast('Please take out wording that pushes people to book quickly. AHPRA does not allow it in health advertising.', 'bad'); return
    }
    if (s.reviews.enabled && !String(s.reviews.count).trim()) { toast('The reviews band needs the number of reviews, for example 500.', 'bad'); return }
    if (String(s.reviews.rating).trim() && !(rating > 0 && rating <= 5)) { toast('The star rating must be a number from 1 to 5, for example 4.9, as Google shows it.', 'bad'); return }
    if (s.reviews.url.trim() && !/^https?:\/\//.test(s.reviews.url.trim())) { toast('The Google Business Profile link must start with https://', 'bad'); return }
    setBusy(true)
    try {
      const body: Record<string, unknown> = {
        practiceName: s.practiceName, logo: s.logo, logoMedia: s.logoMedia ?? null, phone: s.phone.trim(), email: s.email.trim(),
        address: s.address, parking: s.parking, abn: s.abn, hours: s.hours.map((h) => ({ day: h.day, open: h.open, opens: h.open ? h.opens : '', closes: h.open ? h.closes : '' })),
        bookingUrl: s.bookingUrl.trim(), preferredFunds: s.preferredFunds, paymentAccepted: s.paymentAccepted,
        socials: s.socials, colours: s.colours, features: s.features,
        offer: { ...s.offer, price: String(s.offer.price).trim().replace(/^\$/, ''), popupDelay: Math.max(0, Number(s.offer.popupDelay) || 0) },
        reviews: { enabled: s.reviews.enabled, rating: s.reviews.rating.trim(), count: s.reviews.count.trim(), url: s.reviews.url.trim(), logo: s.reviews.logo, logoMedia: s.reviews.logoMedia ?? null },
        priceList: { file: s.priceList.file, fileDoc: s.priceList.fileDoc ?? null, delivery: s.priceList.delivery, buttonLabel: s.priceList.buttonLabel, consentText: s.priceList.consentText, thankYou: s.priceList.thankYou },
        schemes: s.schemes,
        seoDefaults: { titleSuffix: s.seoDefaults.titleSuffix, description: s.seoDefaults.description, ogImage: s.seoDefaults.ogImage, ogImageMedia: s.seoDefaults.ogImageMedia ?? null },
      }
      if (isAdmin) body.tracking = s.tracking
      await api('/api/globals/site-settings?depth=0', { method: 'POST', body })
      setDirty(false)
      toast('Settings saved. Press Publish website to update every page.', 'good')
    } catch (e) {
      toast((e as Error).message, 'bad')
    } finally {
      setBusy(false)
    }
  }

  const colour = (label: string, key: keyof S['colours']) => (
    <div className="field">
      <span className="lab">{label}</span>
      <div className="colour">
        <input type="color" value={s.colours[key] || ORIGINAL_COLOURS[key]} onChange={(e) => setCol({ [key]: e.target.value } as Partial<S['colours']>)} aria-label={label} />
        <input className="input" style={{ maxWidth: 120 }} value={s.colours[key]} placeholder={ORIGINAL_COLOURS[key]} onChange={(e) => setCol({ [key]: e.target.value.trim() } as Partial<S['colours']>)} />
        {s.colours[key] ? <button className="btn small ghost" onClick={() => setCol({ [key]: '' } as Partial<S['colours']>)}>Use the original</button> : <span className="help">Original</span>}
      </div>
    </div>
  )

  return (
    <div className="cols">
      <div>
        <Panel id="practice" title="Practice details" intro="These appear across the whole website: the header, footer, contact page, booking buttons and Google's business details. Change them here once.">
          <div className="row">
            <TextInput label="Phone" value={s.phone} onChange={(v) => set({ phone: v })} help={`Shown as written. Google gets ${phoneIntl(s.phone)}.`} />
            <TextInput label="Email" type="email" value={s.email} onChange={(v) => set({ email: v })} />
          </div>
          <div className="row">
            <TextInput label="Unit and building" value={s.address.unit} onChange={(v) => setA({ unit: v })} />
            <TextInput label="Street" value={s.address.street} onChange={(v) => setA({ street: v })} />
          </div>
          <div className="row">
            <TextInput label="Street, short version" value={s.address.streetShort} onChange={(v) => setA({ streetShort: v })} help="Used where space is tight, for example 520 Wickham St." />
            <TextInput label="Suburb" value={s.address.suburb} onChange={(v) => setA({ suburb: v })} />
          </div>
          <div className="row">
            <TextInput label="State" value={s.address.state} onChange={(v) => setA({ state: v })} />
            <TextInput label="Postcode" value={s.address.postcode} onChange={(v) => setA({ postcode: v })} />
          </div>
          <TextInput label="Parking note" value={s.parking} onChange={(v) => set({ parking: v })} />
          <TextInput label="Google Maps embed link" value={s.address.mapEmbed} onChange={(v) => setA({ mapEmbed: v.trim() })} help="The address of the map shown on the contact page. Only change this if the practice moves." />
          <div className="row">
            <TextInput label="Map latitude" value={geo.lat} onChange={(v) => { setGeo({ ...geo, lat: v }); if (Number.isFinite(Number(v)) && v.trim() !== '' && v.trim() !== '-') setA({ latitude: Number(v) }) }} help="Used by Google Maps and search. Only change if the practice moves." />
            <TextInput label="Map longitude" value={geo.lng} onChange={(v) => { setGeo({ ...geo, lng: v }); if (Number.isFinite(Number(v)) && v.trim() !== '' && v.trim() !== '-') setA({ longitude: Number(v) }) }} />
          </div>
          <TextInput label="ABN" value={s.abn} onChange={(v) => set({ abn: v })} />
        </Panel>

        <Panel id="hours" title="Opening hours" intro="Used in the footer, the Book Your Visit band, the contact page and Google's business details.">
          {s.hours.map((h, i) => (
            <div className="hours-row" key={h.day}>
              <b>{h.day}</b>
              <label className="toggle"><input type="checkbox" checked={h.open} onChange={(e) => setH(i, { open: e.target.checked, opens: h.opens || '09:00', closes: h.closes || '17:00' })} /><span className="track" /><span>{h.open ? 'Open' : 'Closed'}</span></label>
              {h.open ? <><input className="input" type="time" aria-label={`${h.day} opens`} value={h.opens} onChange={(e) => setH(i, { opens: e.target.value })} />
                <input className="input" type="time" aria-label={`${h.day} closes`} value={h.closes} onChange={(e) => setH(i, { closes: e.target.value })} /></> : <><span /><span /></>}
            </div>
          ))}
          <p className="help" style={{ marginTop: 10 }}>Shown on the website as: {hoursSummary(s.hours)}</p>
          <p className="help">Hours written into a page&apos;s own wording (for example an FAQ answer) are changed on that page.</p>
        </Panel>

        <Panel id="booking" title="Booking and payments">
          <TextInput label="Online booking link" value={s.bookingUrl} onChange={(v) => set({ bookingUrl: v })} help="Every Book Online button on the website goes here." />
          <TextInput label="Preferred provider health funds" value={s.preferredFunds} onChange={(v) => set({ preferredFunds: v })} help="Written as it reads in a sentence, for example Bupa, HCF and CBHS. It appears wherever the website says who the practice is a preferred provider for." />
          <TextInput label="Payment methods" value={s.paymentAccepted} onChange={(v) => set({ paymentAccepted: v })} help="Shown to Google with the practice details." />
        </Panel>

        <Panel id="social" title="Social media" intro="The icons in the footer link here. Leave a box empty if the practice is not on that platform.">
          <div className="row"><TextInput label="Facebook" value={s.socials.facebook} onChange={(v) => setSoc({ facebook: v.trim() })} placeholder="https://www.facebook.com/..." />
            <TextInput label="Instagram" value={s.socials.instagram} onChange={(v) => setSoc({ instagram: v.trim() })} placeholder="https://www.instagram.com/..." /></div>
          <div className="row"><TextInput label="YouTube" value={s.socials.youtube} onChange={(v) => setSoc({ youtube: v.trim() })} />
            <TextInput label="LinkedIn" value={s.socials.linkedin} onChange={(v) => setSoc({ linkedin: v.trim() })} /></div>
          <TextInput label="Google Business Profile" value={s.socials.googleBusiness} onChange={(v) => setSoc({ googleBusiness: v.trim() })} />
        </Panel>

        <Panel id="brand" title="Logo and colours">
          <ImageSlot label="Logo (header and footer)" value={s.logo} original="/assets/img/logo.png" onChange={(v) => set({ logo: v.value, logoMedia: v.media })} />
          <p className="help" style={{ marginTop: -6, marginBottom: 14 }}>Use a PNG with a transparent background, about 400 pixels wide.</p>
          <div className="grid-3">
            {colour('Dark brand colour', 'navy')}
            {colour('Accent colour', 'blue')}
            {colour('Accent colour, darker', 'blueDark')}
          </div>
          <p className="help">Leave these on the original unless the practice&apos;s branding changes.</p>
        </Panel>

        <Panel id="seo" title="SEO defaults" intro="Used for any page that does not have its own.">
          <TextArea label="Default description in Google" value={s.seoDefaults.description} onChange={(v) => setSeo({ description: v })} />
          <ImageSlot label="Default share image" value={s.seoDefaults.ogImage} original="/assets/img/og-image.jpg" onChange={(v) => setSeo({ ogImage: v.value, ogImageMedia: v.media })} />
        </Panel>

        <Panel id="offer" title="New patient offer" intro="The offer strip under the homepage hero, the offer panel on the New Patients page, the small pop-up and the terms page all come from here.">
          <Notice tone="info" icon={Icon.info()}><p>AHPRA: an offer must show its exact price, what is included, who it is for and the dates it runs, with the terms easy to find. No wording that pushes people to book quickly, and no &ldquo;free&rdquo; unless the practice has approved it.</p></Notice>
          <Toggle label="Show the new patient offer on the website" checked={s.offer.enabled} onChange={(v) => setO({ enabled: v })} />
          <div className="row">
            <TextInput label="Price (dollars)" value={s.offer.price} onChange={(v) => setO({ price: v })} placeholder="229" help="Numbers only. Shown as $229." />
            <TextInput label="Name of the offer" value={s.offer.title} onChange={(v) => setO({ title: v })} />
          </div>
          <TextArea label="What is included (one item per line)" value={s.offer.inclusions} onChange={(v) => setO({ inclusions: v })} rows={5} />
          <TextInput label="Offer period" value={s.offer.period} onChange={(v) => setO({ period: v })} placeholder="Available from 15 October to 31 December 2026."
            help="The dates the offer runs, shown next to the terms line and on the terms page." />
          {s.offer.enabled && !s.offer.period.trim() ? <Notice tone="warn" icon={Icon.info()}><p>The offer period is empty. The terms page says &ldquo;To be confirmed&rdquo; until it is filled in.</p></Notice> : null}
          <div className="row">
            <TextInput label="Terms line" value={s.offer.termsLine} onChange={(v) => setO({ termsLine: v })} help="Links to the terms page." />
            <TextInput label="Booking button wording" value={s.offer.bookLabel} onChange={(v) => setO({ bookLabel: v })} />
          </div>
          <TextArea label="Full terms and conditions" value={s.offer.terms} onChange={(v) => setO({ terms: v })} rows={6}
            help="Shown on the terms page (/new-patient-offer-terms/). Leave an empty line between paragraphs. While empty, the page shows a placeholder note." />
          <div className="row">
            <Toggle label="Strip under the homepage hero" checked={s.offer.showBanner} onChange={(v) => setO({ showBanner: v })} />
            <Toggle label="Pop-up in the middle of the screen (once per visit)" checked={s.offer.showPopup} onChange={(v) => setO({ showPopup: v })} />
          </div>
          <TextInput label="Pop-up appears after (seconds)" type="number" value={String(s.offer.popupDelay)} onChange={(v) => setO({ popupDelay: Number(v) || 0 })}
            help="How long after the first page opens. 0 means only when a computer visitor moves to leave the page. It shows once per visit and closes with the X, the Esc key or a click outside it. It is not shown on the New Patients and terms pages." />
        </Panel>

        <Panel id="reviews" title="Google reviews band" intro="The &ldquo;Over 500 Google Reviews&rdquo; band on the homepage, under the offer strip. It links to the practice's Google listing. Review wording is never shown.">
          <Notice tone="info" icon={Icon.info()}><p>AHPRA treats patient reviews about clinical care as testimonials, so the website shows only the number of reviews and the star rating, never what reviewers wrote. Keep both the same as Google shows them, and update the number every so often.</p></Notice>
          <Toggle label="Show the Google reviews band" checked={s.reviews.enabled} onChange={(v) => setR({ enabled: v })} />
          <div className="row">
            <TextInput label="Number of reviews" value={s.reviews.count} onChange={(v) => setR({ count: v })} placeholder="500" help="Shown as Over 500. Round down to what Google shows." />
            <TextInput label="Star rating (optional)" value={s.reviews.rating} onChange={(v) => setR({ rating: v })} placeholder="4.9" help="As shown on Google. When filled in, the stars and the rating appear next to Reviews." />
          </div>
          <TextInput label="Google Business Profile link (optional)" value={s.reviews.url} onChange={(v) => setR({ url: v.trim() })} placeholder="https://g.page/..."
            help={s.socials.googleBusiness && !s.reviews.url ? <>Blank uses the footer&apos;s Google link. <button type="button" className="btn small ghost" onClick={() => setR({ url: s.socials.googleBusiness })}>Use it here</button></> : 'Blank opens Google Maps searching for the practice. Opens in a new tab.'} />
          <ImageSlot label="Google logo (optional)" value={s.reviews.logo} onChange={(v) => setR({ logo: v.value, logoMedia: v.media })} />
          <p className="help" style={{ marginTop: -6 }}>Upload Google&apos;s own logo file (from Google&apos;s brand resources, or the same file the old website used). Without it the band shows the word Google in the website&apos;s font.</p>
        </Panel>

        <Panel id="pricelist" title="Price list" intro="The Download Our Price List form on the homepage, the New Patients page and Prices and Payment Options (the footer button links to it).">
          <div className="field"><span className="lab">Price list PDF</span>
            <div className="actions">
              {s.priceList.file ? <a className="btn small ghost" href={s.priceList.file} target="_blank" rel="noopener">{Icon.external()} Open the current PDF</a> : <span className="help">No PDF uploaded yet.</span>}
              <label className="btn small">{Icon.upload()} {pdfBusy ? 'Uploading...' : s.priceList.file ? 'Replace the PDF' : 'Upload the PDF'}
                <input type="file" accept="application/pdf" hidden onChange={(e) => { uploadPdf(e.target.files?.[0]); e.target.value = '' }} /></label>
            </div>
            <div className="help">Never linked on the website itself, so people get it through the form.</div>
          </div>
          <Select label="Who emails the price list" value={s.priceList.delivery} onChange={(v) => setP({ delivery: v === 'website' ? 'website' : 'smileox' })}
            options={[{ value: 'smileox', label: 'SmileOx automation (the contact is tagged Price List Download)' }, { value: 'website', label: 'The website, straight away (a link to the PDF above)' }]}
            help="Either way, every request goes to SmileOx, reception and the Enquiries list, with where the visitor came from." />
          {s.priceList.delivery === 'website' && !s.priceList.file ? <Notice tone="warn" icon={Icon.info()}><p>Upload the PDF, or visitors will not receive anything.</p></Notice> : null}
          <TextInput label="Button wording" value={s.priceList.buttonLabel} onChange={(v) => setP({ buttonLabel: v })} />
          <TextArea label="Consent wording (next to the tick box)" value={s.priceList.consentText} onChange={(v) => setP({ consentText: v })} help="A link to the Privacy Statement is added after it." />
          <TextArea label="Thank-you message" value={s.priceList.thankYou} onChange={(v) => setP({ thankYou: v })} help="Shown in place of the form once it is sent." />
        </Panel>

        <Panel id="schemes" title="Health funds and government schemes" intro="Lines on the Health Funds and Government Schemes page that appear only once the practice confirms them.">
          <Toggle label="HICAPS: claim on the spot" checked={s.schemes.hicaps} onChange={(v) => setSc({ hicaps: v })} help="Adds: Claims can be processed on the spot with HICAPS, so you only pay any gap on the day." />
          <Toggle label="CDBS: we bulk bill" checked={s.schemes.cdbsBulkBill} onChange={(v) => setSc({ cdbsBulkBill: v })} help="Adds: We bulk bill eligible CDBS services, so there is no out-of-pocket cost for treatment covered by the schedule, up to your child's benefit cap." />
          <Toggle label="DVA: we bill DVA directly" checked={s.schemes.dvaDirectBill} onChange={(v) => setSc({ dvaDirectBill: v })} help="Adds: We bill DVA directly for eligible treatment, so there is nothing for you to claim yourself." />
        </Panel>

        <Panel id="features" title="Site features" intro="Switches for parts of the website.">
          <Toggle label="Emergency dentistry" checked={s.features.emergencyDentistry} onChange={(v) => setF({ emergencyDentistry: v })}
            help="When off, the Emergency column is taken out of the Services menu. The emergency pages stay on the website." />
          <Toggle label="Pre-opening mode" checked={s.features.mode === 'pre-opening'} onChange={(v) => setF({ mode: v ? 'pre-opening' : 'open' })}
            help="For a practice that has not opened yet. Precision Dental is open, so this has no effect on this website." />
          <Toggle label="Child Dental Benefits Schedule (CDBS)" checked={s.features.cdbs} onChange={(v) => setF({ cdbs: v })} help="Not used on this website yet. Ask GYA before switching it on." />
          <Toggle label="Zip and Afterpay" checked={s.features.zipAfterpay} onChange={(v) => setF({ zipAfterpay: v })} help="Not used on this website yet. Ask GYA before switching it on." />
          <Toggle label="Countdown" checked={s.features.countdown} onChange={(v) => setF({ countdown: v })} help="Not used on this website yet." />
        </Panel>

        {isAdmin ? (
          <Panel id="tracking" title="Tracking (GYA only)" intro="Added to every page only when filled in. Practice editors cannot see this section.">
            <div className="row">
              <TextInput label="Google Tag Manager ID" value={s.tracking.gtmId} onChange={(v) => setT({ gtmId: v.trim() })} placeholder="GTM-XXXXXXX" />
              <TextInput label="Google Analytics 4 ID" value={s.tracking.ga4Id} onChange={(v) => setT({ ga4Id: v.trim() })} placeholder="G-XXXXXXXXXX" />
              <TextInput label="Meta Pixel ID" value={s.tracking.metaPixelId} onChange={(v) => setT({ metaPixelId: v.trim() })} placeholder="Numbers only" />
            </div>
            <div className="row">
              <TextInput label="Google Ads ID" value={s.tracking.googleAdsId} onChange={(v) => setT({ googleAdsId: v.trim() })} placeholder="AW-123456789" />
              <TextInput label="Price list conversion label" value={s.tracking.adsPriceListLabel} onChange={(v) => setT({ adsPriceListLabel: v.trim() })} placeholder="AbC-D_efG-h12" />
            </div>
            <p className="help">If GA4 runs inside Tag Manager, fill in only the Tag Manager ID so visits are not counted twice. A sent price list form fires GA4 generate_lead, the Google Ads conversion above, Meta Lead, and the dataLayer event price_list_download for Tag Manager.</p>
          </Panel>
        ) : null}
      </div>
      <div className="sticky">
        <div className="panel">
          <h2 style={{ marginBottom: 8 }}>Save</h2>
          <p className={dirty ? '' : 'help'} style={{ color: dirty ? 'var(--pd-warn)' : undefined, fontWeight: dirty ? 600 : 400 }}>{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</p>
          <div className="actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <button className="btn primary" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving...' : 'Save settings'}</button>
            <PublishButton />
          </div>
        </div>
        <div className="panel">
          <h3 style={{ marginBottom: 6 }}>On this screen</h3>
          <ul className="list-plain">
            {[['practice', 'Practice details'], ['hours', 'Opening hours'], ['booking', 'Booking and payments'], ['social', 'Social media'], ['brand', 'Logo and colours'], ['seo', 'SEO defaults'], ['offer', 'New patient offer'], ['reviews', 'Google reviews band'], ['pricelist', 'Price list'], ['schemes', 'Health funds and schemes'], ['features', 'Site features'], ...(isAdmin ? [['tracking', 'Tracking']] : [])].map(([id, l]) => (
              <li key={id}><a href={`#${id}`}>{l}</a></li>
            ))}
          </ul>
        </div>
        <Notice tone="info" icon={Icon.info()}><p>Phone, email, address, hours, booking link, parking and preferred funds update on every page at once when you publish.</p></Notice>
      </div>
    </div>
  )
}
