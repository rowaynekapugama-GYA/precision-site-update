/**
 * The JSON model in the repo (content/) and the dashboard's database, one for one.
 *
 * toDoc() turns a page, post, team member or the settings into what Payload
 * stores; fromDoc() turns it back. An untouched item makes the round trip byte for
 * byte, which is how "seed, pull, diff = zero differences" is proven, and so the
 * live site cannot change just because the content went through the database.
 */
import type { Payload } from 'payload'
import type { BeforeAfterCase, Block, Content, Field, Page, Post, Redirect, Section, Settings, TeamMember } from '../render/types'
import { withLeadDefaults } from '../render/leads'

type Doc = Record<string, any>

// --------------------------------------------------------------- media
/** A media document's address, root-relative unless it lives in Blob storage. */
export function mediaUrl(doc: Doc | null | undefined, size?: 'og' | 'thumb'): string {
  if (!doc) return ''
  const raw: string = (size && doc.sizes?.[size]?.url) || doc.url || ''
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw) && !raw.includes('/api/media/')) return raw
  const u = new URL(raw, 'http://local.invalid')
  return u.pathname.replace(/\/+$/, '') + u.search
}

export type MediaMap = Map<string, Doc>

export async function loadMediaMap(payload: Payload): Promise<MediaMap> {
  const res = await payload.find({ collection: 'media', limit: 10000, depth: 0, pagination: false, overrideAccess: true })
  return new Map(res.docs.map((d) => [String(d.id), d as Doc]))
}

/** What Payload stores for an upload: the numeric id, or null. */
export const toRel = (v: unknown): number | string | null => {
  if (v === null || v === undefined || v === '') return null
  return /^\d+$/.test(String(v)) ? Number(v) : (v as string)
}

const relId = (v: unknown): string | null => {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'object') return (v as { id?: unknown }).id != null ? String((v as { id: unknown }).id) : null
  return String(v)
}

function resolveFields(fields: Field[] | undefined, media: MediaMap) {
  for (const f of fields || []) {
    if (f.media != null && (f.type === 'image')) {
      const m = media.get(String(f.media))
      if (m) f.value = mediaUrl(m)
    }
  }
}

// ---------------------------------------------------------------- pages
export function pageToDoc(p: Page): Doc {
  return {
    key: p.key,
    label: p.label,
    url: p.url ?? '',
    group: p.group,
    seoTitle: p.seo.title,
    seoDescription: p.seo.description,
    ogImage: p.seo.ogImage,
    ogImageMedia: toRel(p.seo.ogImageMedia),
    canonical: p.seo.canonical,
    noindex: !!p.seo.noindex,
    lastmod: p.lastmod ?? '',
    model: JSON.stringify({ file: p.file, layout: p.layout, tail: p.tail, sections: p.sections }),
  }
}

export function pageFromDoc(d: Doc, media: MediaMap): Page {
  const m = JSON.parse(d.model)
  const sections: Section[] = m.sections
  for (const s of sections) resolveFields(s.fields, media)
  const ogId = relId(d.ogImageMedia)
  const seo: any = {
    title: d.seoTitle ?? '',
    description: d.seoDescription ?? '',
    ogImage: ogId && media.get(ogId) ? mediaUrl(media.get(ogId), 'og') : (d.ogImage ?? ''),
  }
  if (ogId) seo.ogImageMedia = ogId
  seo.canonical = d.canonical ?? ''
  seo.noindex = !!d.noindex
  return {
    key: d.key,
    file: m.file,
    url: d.url ? d.url : null,
    label: d.label,
    group: d.group ?? '',
    seo,
    lastmod: d.lastmod ? d.lastmod : null,
    layout: m.layout,
    tail: m.tail,
    sections,
  }
}

// --------------------------------------------------------------- blocks
export function blockToDoc(b: Block): Doc {
  return { key: b.key, label: b.label, model: JSON.stringify({ template: b.template, fields: b.fields }) }
}

export function blockFromDoc(d: Doc, media: MediaMap): Block {
  const m = JSON.parse(d.model)
  resolveFields(m.fields, media)
  return { key: d.key, label: d.label, template: m.template, fields: m.fields }
}

// ---------------------------------------------------------------- posts
export function postToDoc(p: Post): Doc {
  return {
    slug: p.slug,
    order: p.order,
    status: p.status,
    title: p.title,
    categories: p.categories,
    author: p.author,
    published: p.published ?? '',
    modified: p.modified,
    readMinutes: p.readMinutes,
    excerpt: p.excerpt,
    image: p.image,
    imageMedia: toRel(p.imageMedia),
    imageAlt: p.imageAlt,
    imageCaption: p.imageCaption,
    body: p.body,
    faq: p.faq,
    risk: p.risk,
    related: p.related,
    seoTitle: p.seo.title,
    seoDescription: p.seo.description,
    ogImage: p.seo.ogImage,
    ogImageMedia: toRel(p.seo.ogImageMedia),
    canonical: p.seo.canonical,
    noindex: !!p.seo.noindex,
    lastmod: p.lastmod ?? '',
  }
}

export function postFromDoc(d: Doc, media: MediaMap): Post {
  const imgId = relId(d.imageMedia)
  const ogId = relId(d.ogImageMedia)
  const out: any = {}
  out.slug = d.slug
  out.order = d.order ?? 0
  out.status = d.status === 'published' ? 'published' : 'draft'
  out.title = d.title ?? ''
  out.categories = Array.isArray(d.categories) ? d.categories : []
  out.author = d.author ?? 'Precision Dental'
  out.published = d.published ? d.published : null
  out.modified = d.modified ?? ''
  out.readMinutes = d.readMinutes ?? 1
  out.excerpt = d.excerpt ?? ''
  out.image = imgId && media.get(imgId) ? mediaUrl(media.get(imgId)) : (d.image ?? '')
  if (imgId) out.imageMedia = imgId
  out.imageAlt = d.imageAlt ?? ''
  out.imageCaption = d.imageCaption ?? ''
  out.body = d.body ?? ''
  out.faq = Array.isArray(d.faq) ? d.faq.map((f: Doc) => ({ q: f.q ?? '', a: Array.isArray(f.a) ? f.a : [] })) : []
  out.risk = !!d.risk
  out.related = Array.isArray(d.related) ? d.related : []
  const seo: any = {
    title: d.seoTitle ?? '',
    description: d.seoDescription ?? '',
    ogImage: ogId && media.get(ogId) ? mediaUrl(media.get(ogId), 'og') : (d.ogImage ?? ''),
  }
  if (ogId) seo.ogImageMedia = ogId
  seo.canonical = d.canonical ?? ''
  seo.noindex = !!d.noindex
  out.seo = seo
  out.lastmod = d.lastmod ? d.lastmod : null
  return out as Post
}

// ----------------------------------------------------------------- team
export function teamToDoc(t: TeamMember): Doc {
  return {
    name: t.name, role: t.role, qualifications: t.qualifications, photo: t.photo,
    photoMedia: toRel(t.photoMedia), photoAlt: t.photoAlt, bio: t.bio, profileUrl: t.profileUrl,
    profileLinkText: t.profileLinkText, hidden: !!t.hidden, order: t.order,
    registrationType: t.registrationType ?? '', registrationNumber: t.registrationNumber ?? '',
  }
}

export function teamFromDoc(d: Doc, media: MediaMap): TeamMember {
  const pid = relId(d.photoMedia)
  const out: any = {}
  out.name = d.name ?? ''
  out.role = d.role ?? ''
  out.qualifications = d.qualifications ?? ''
  out.photo = pid && media.get(pid) ? mediaUrl(media.get(pid)) : (d.photo ?? '')
  if (pid) out.photoMedia = pid
  out.photoAlt = d.photoAlt ?? ''
  out.bio = d.bio ?? ''
  out.profileUrl = d.profileUrl ?? ''
  out.profileLinkText = d.profileLinkText ?? ''
  out.hidden = !!d.hidden
  out.order = d.order ?? 0
  out.registrationType = d.registrationType ?? ''
  out.registrationNumber = d.registrationNumber ?? ''
  return out as TeamMember
}

// ------------------------------------------------------------- settings
export function settingsToDoc(settings: Settings): Doc {
  const s = withLeadDefaults(settings)
  return {
    practiceName: s.practiceName,
    logo: s.logo,
    logoMedia: toRel(s.logoMedia),
    phone: s.phone,
    email: s.email,
    address: { ...s.address, crossStreet: s.address.crossStreet || '' },
    parking: s.parking,
    serviceAreaLine: s.serviceAreaLine || '',
    areaServed: s.areaServed || '',
    abn: s.abn,
    hours: s.hours.map((h) => ({ ...h })),
    bookingUrl: s.bookingUrl,
    preferredFunds: s.preferredFunds,
    paymentAccepted: s.paymentAccepted,
    socials: { ...s.socials },
    colours: { ...s.colours },
    tracking: { ...s.tracking },
    features: { ...s.features },
    offer: { ...s.offer, popupDelay: Number(s.offer.popupDelay) || 0 },
    reviews: { enabled: !!s.reviews.enabled, rating: s.reviews.rating, count: s.reviews.count, url: s.reviews.url, logo: s.reviews.logo, logoMedia: toRel(s.reviews.logoMedia) },
    priceList: {
      file: s.priceList.file, fileDoc: toRel(s.priceList.fileDoc), delivery: s.priceList.delivery,
      buttonLabel: s.priceList.buttonLabel, consentText: s.priceList.consentText, thankYou: s.priceList.thankYou,
    },
    schemes: { ...s.schemes },
    seoDefaults: {
      titleSuffix: s.seoDefaults.titleSuffix, description: s.seoDefaults.description,
      ogImage: s.seoDefaults.ogImage, ogImageMedia: toRel(s.seoDefaults.ogImageMedia),
    },
    imageReplacements: (s.imageReplacements || []).map((r) => ({ from: r.from, to: r.to, media: toRel(r.media) })),
  }
}

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))

export function settingsFromDoc(d: Doc, media: MediaMap, docs?: MediaMap): Settings {
  const a = d.address || {}
  const o = d.offer || {}, rv = d.reviews || {}, pl = d.priceList || {}, sc = d.schemes || {}
  const rvLogo = relId(rv.logoMedia)
  const plDoc = relId(pl.fileDoc)
  const logoId = relId(d.logoMedia)
  const ogId = relId(d.seoDefaults?.ogImageMedia)
  const out: any = {
    practiceName: str(d.practiceName),
    logo: logoId && media.get(logoId) ? mediaUrl(media.get(logoId)) : str(d.logo),
    ...(logoId ? { logoMedia: logoId } : {}),
    phone: str(d.phone),
    email: str(d.email),
    address: {
      unit: str(a.unit), street: str(a.street), streetShort: str(a.streetShort), suburb: str(a.suburb),
      state: str(a.state), postcode: str(a.postcode),
      latitude: typeof a.latitude === 'number' ? a.latitude : Number(a.latitude || 0),
      longitude: typeof a.longitude === 'number' ? a.longitude : Number(a.longitude || 0),
      mapEmbed: str(a.mapEmbed),
      crossStreet: str(a.crossStreet),
    },
    parking: str(d.parking),
    serviceAreaLine: str(d.serviceAreaLine),
    areaServed: str(d.areaServed),
    abn: str(d.abn),
    hours: (d.hours || []).map((h: Doc) => ({ day: str(h.day), open: !!h.open, opens: str(h.opens), closes: str(h.closes) })),
    bookingUrl: str(d.bookingUrl),
    preferredFunds: str(d.preferredFunds),
    paymentAccepted: str(d.paymentAccepted),
    socials: {
      facebook: str(d.socials?.facebook), instagram: str(d.socials?.instagram), youtube: str(d.socials?.youtube),
      linkedin: str(d.socials?.linkedin), googleBusiness: str(d.socials?.googleBusiness),
    },
    colours: { navy: str(d.colours?.navy), blue: str(d.colours?.blue), blueDark: str(d.colours?.blueDark) },
    tracking: {
      ga4Id: str(d.tracking?.ga4Id), gtmId: str(d.tracking?.gtmId), metaPixelId: str(d.tracking?.metaPixelId),
      googleAdsId: str(d.tracking?.googleAdsId), adsPriceListLabel: str(d.tracking?.adsPriceListLabel),
    },
    features: {
      mode: d.features?.mode === 'pre-opening' ? 'pre-opening' : 'open',
      emergencyDentistry: d.features?.emergencyDentistry !== false,
      cdbs: !!d.features?.cdbs,
      zipAfterpay: !!d.features?.zipAfterpay,
      countdown: !!d.features?.countdown,
      countdownDate: str(d.features?.countdownDate),
    },
    offer: {
      enabled: !!o.enabled, showBanner: o.showBanner !== false, showPopup: o.showPopup !== false,
      popupDelay: typeof o.popupDelay === 'number' ? o.popupDelay : Number(o.popupDelay ?? 2),
      title: str(o.title) || 'New Patient Offer', price: str(o.price), inclusions: str(o.inclusions), period: str(o.period),
      termsLine: str(o.termsLine) || 'New patients only. Terms and conditions apply.',
      termsUrl: str(o.termsUrl) || '/new-patient-offer-terms/', terms: str(o.terms), bookLabel: str(o.bookLabel) || 'Book Now',
    },
    reviews: {
      enabled: !!rv.enabled, rating: str(rv.rating), count: str(rv.count), url: str(rv.url),
      logo: rvLogo && media.get(rvLogo) ? mediaUrl(media.get(rvLogo)) : str(rv.logo),
      ...(rvLogo ? { logoMedia: rvLogo } : {}),
    },
    priceList: {
      file: plDoc && docs?.get(plDoc) ? mediaUrl(docs.get(plDoc)) : str(pl.file),
      ...(plDoc ? { fileDoc: plDoc } : {}),
      delivery: pl.delivery === 'website' ? 'website' : 'smileox',
      buttonLabel: str(pl.buttonLabel), consentText: str(pl.consentText), thankYou: str(pl.thankYou),
    },
    schemes: { hicaps: !!sc.hicaps, cdbsBulkBill: !!sc.cdbsBulkBill, dvaDirectBill: !!sc.dvaDirectBill },
    seoDefaults: {
      titleSuffix: str(d.seoDefaults?.titleSuffix),
      description: str(d.seoDefaults?.description),
      ogImage: ogId && media.get(ogId) ? mediaUrl(media.get(ogId), 'og') : str(d.seoDefaults?.ogImage),
      ...(ogId ? { ogImageMedia: ogId } : {}),
    },
    imageReplacements: (d.imageReplacements || []).map((r: Doc) => {
      const mid = relId(r.media)
      const to = mid && media.get(mid) ? mediaUrl(media.get(mid)) : str(r.to)
      return mid ? { from: str(r.from), to, media: mid } : { from: str(r.from), to }
    }).filter((r: { from: string; to: string }) => r.from && r.to),
  }
  return withLeadDefaults(out as Settings)
}

// ------------------------------------------------------ before and after
export function caseToDoc(c: BeforeAfterCase): Doc {
  return {
    ref: c.id, page: c.page, title: c.title,
    before: c.before, beforeMedia: toRel(c.beforeMedia), beforeAlt: c.beforeAlt,
    after: c.after, afterMedia: toRel(c.afterMedia), afterAlt: c.afterAlt,
    caption: c.caption, consentDocumented: !!c.consentDocumented, consentDate: c.consentDate, consentRecord: c.consentRecord,
    unedited: !!c.unedited, consistentLighting: !!c.consistentLighting, published: !!c.published, order: c.order,
  }
}

export function caseFromDoc(d: Doc, media: MediaMap): BeforeAfterCase {
  const b = relId(d.beforeMedia), a = relId(d.afterMedia)
  const out: any = { id: str(d.ref) || String(d.id), page: str(d.page), title: str(d.title) }
  out.before = b && media.get(b) ? mediaUrl(media.get(b)) : str(d.before)
  if (b) out.beforeMedia = b
  out.beforeAlt = str(d.beforeAlt)
  out.after = a && media.get(a) ? mediaUrl(media.get(a)) : str(d.after)
  if (a) out.afterMedia = a
  out.afterAlt = str(d.afterAlt)
  out.caption = str(d.caption)
  out.consentDocumented = !!d.consentDocumented
  out.consentDate = str(d.consentDate)
  out.consentRecord = str(d.consentRecord)
  out.unedited = !!d.unedited
  out.consistentLighting = !!d.consistentLighting
  out.published = !!d.published
  out.order = d.order ?? 0
  return out as BeforeAfterCase
}

export async function loadDocumentMap(payload: Payload): Promise<MediaMap> {
  try {
    const res = await payload.find({ collection: 'documents' as any, limit: 1000, depth: 0, pagination: false, overrideAccess: true })
    return new Map(res.docs.map((d) => [String(d.id), d as Doc]))
  } catch {
    return new Map()
  }
}

// ------------------------------------------------------------ redirects
export function redirectFromDoc(d: Doc): Redirect {
  return { from: str(d.from), to: str(d.to), permanent: d.permanent !== false }
}

// --------------------------------------------------- import and pull
export const CTX = { skipStatus: true, skipDates: true }

async function upsert(payload: Payload, collection: string, field: string, value: string, data: Doc, overwrite: boolean) {
  const found = await payload.find({
    collection: collection as any, where: { [field]: { equals: value } }, limit: 1, depth: 0, overrideAccess: true,
  })
  if (found.docs.length) {
    if (!overwrite) return 'kept'
    await payload.update({ collection: collection as any, id: found.docs[0].id, data, overrideAccess: true, context: CTX, depth: 0 })
    return 'updated'
  }
  await payload.create({ collection: collection as any, data, overrideAccess: true, context: CTX, depth: 0 })
  return 'created'
}

export interface ImportReport { [k: string]: { created: number; updated: number; kept: number } }

/**
 * Load the repo's JSON into the database. Safe to run again: what is already in
 * the database is kept unless overwrite is set, which resets it to the repo.
 */
export async function importContent(payload: Payload, c: Content, overwrite = false): Promise<ImportReport> {
  const report: ImportReport = {}
  const tally = (k: string, r: string) => {
    report[k] = report[k] || { created: 0, updated: 0, kept: 0 }
    report[k][r as 'created' | 'updated' | 'kept']++
  }
  for (const p of c.pages) tally('pages', await upsert(payload, 'pages', 'key', p.key, pageToDoc(p), overwrite))
  for (const b of Object.values(c.blocks)) tally('blocks', await upsert(payload, 'shared-blocks', 'key', b.key, blockToDoc(b), overwrite))
  for (const p of c.posts) tally('posts', await upsert(payload, 'posts', 'slug', p.slug, postToDoc(p), overwrite))
  for (const r of c.redirects) tally('redirects', await upsert(payload, 'redirects', 'from', r.from, { ...r }, overwrite))
  for (const bc of c.beforeAfter || []) tally('beforeAfter', await upsert(payload, 'before-after', 'ref', bc.id, caseToDoc(bc), overwrite))

  const team = await payload.find({ collection: 'team', limit: 1, depth: 0, overrideAccess: true })
  if (team.totalDocs === 0 || overwrite) {
    if (overwrite) await payload.delete({ collection: 'team', where: { id: { exists: true } }, overrideAccess: true, context: CTX })
    for (const t of c.team) {
      await payload.create({ collection: 'team', data: teamToDoc(t), overrideAccess: true, context: CTX })
      tally('team', 'created')
    }
  } else {
    report.team = { created: 0, updated: 0, kept: team.totalDocs }
  }

  const current = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })
  if (!current?.phone || overwrite) {
    await payload.updateGlobal({ slug: 'site-settings', data: settingsToDoc(c.settings), overrideAccess: true, context: CTX })
    tally('settings', current?.phone ? 'updated' : 'created')
  } else {
    tally('settings', 'kept')
  }
  return report
}

/** Everything the site is built from, read back out of the database. */
export async function pullContent(payload: Payload): Promise<Omit<Content, 'chrome' | 'articleCta'> | null> {
  const count = await payload.count({ collection: 'pages', overrideAccess: true })
  if (!count.totalDocs) return null
  const media = await loadMediaMap(payload)
  const all = async (collection: string, sort?: string) =>
    (await payload.find({ collection: collection as any, limit: 100000, depth: 0, pagination: false, overrideAccess: true, sort })).docs as Doc[]
  const pages = (await all('pages')).map((d) => pageFromDoc(d, media)).sort((a, b) => (a.key < b.key ? -1 : 1))
  const blocks: Record<string, Block> = {}
  for (const d of await all('shared-blocks')) blocks[d.key] = blockFromDoc(d, media)
  const posts = (await all('posts')).map((d) => postFromDoc(d, media)).sort((a, b) => (a.slug < b.slug ? -1 : 1))
  const team = (await all('team', 'order')).map((d) => teamFromDoc(d, media))
  const redirects = (await all('redirects', 'from')).map(redirectFromDoc)
  const settings = settingsFromDoc(await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true }) as Doc, media, await loadDocumentMap(payload))
  const beforeAfter = (await all('before-after', 'order')).map((d) => caseFromDoc(d, media))
  return { pages, blocks, posts, team, redirects, settings, beforeAfter }
}
