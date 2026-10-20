/**
 * The content model the public site is built from.
 *
 * Every page is a list of sections. A section is its own original HTML with each
 * editable value replaced by a {{fN}} placeholder, plus the values. An unedited
 * page therefore renders back byte for byte by construction, while the dashboard
 * still shows named fields (Heading, Paragraph, Photo) rather than markup.
 */

export type FieldType = 'text' | 'rich' | 'image' | 'alt' | 'link'

export interface Field {
  id: string
  label: string
  type: FieldType
  value: string
  /** "2" or "1.3": which repeated card, row or question the field belongs to */
  group?: string
  /** set when the photo was chosen from the Media Library */
  media?: string | number
}

export interface Section {
  key: string
  kind: 'breadcrumbs' | 'header' | 'content' | 'faq' | 'cta' | 'contact' | 'disclaimer' | 'articleIndex'
  label?: string
  /** whitespace and comments that sit before the section in the page */
  before: string
  /** name of a shared block (content/blocks/<name>.json) used instead of a template */
  shared?: string
  template?: string
  fields?: Field[]
  /** part of the alternating white / pale section backgrounds */
  altAuto?: boolean
  alt?: boolean
  pinned?: boolean
  hidden?: boolean
  generated?: 'team' | 'articleIndex' | 'sitemapArticles' | 'beforeAfter'
  /** set on sections added by a content update (scripts/content-updates), so it is only added once */
  ref?: string
}

export interface Seo {
  title: string
  description: string
  /** a site path or full URL; blank uses the page default */
  ogImage: string
  ogImageMedia?: string | number
  /** full URL; blank means the page's own address */
  canonical: string
  noindex: boolean
}

export interface PageLayout {
  head: 'std' | string
  pre: 'std' | string
  post: 'std' | string
  schema: 'gen' | 'none'
  schemaLiteral?: string
}

export interface Page {
  key: string
  file: string
  url: string | null
  label: string
  group: string
  seo: Seo
  lastmod: string | null
  layout: PageLayout
  tail: string
  sections: Section[]
}

export interface Block {
  key: string
  label: string
  template: string
  fields: Field[]
}

export interface FaqItem {
  q: string
  a: string[]
}

export interface Post {
  slug: string
  order: number
  status: 'published' | 'draft'
  title: string
  categories: string[]
  author: string
  published: string | null
  modified: string
  readMinutes: number
  excerpt: string
  image: string
  imageMedia?: string | number
  imageAlt: string
  imageCaption: string
  body: string
  faq: FaqItem[]
  risk: boolean
  related: string[]
  seo: Seo
  lastmod: string | null
}

export interface TeamMember {
  name: string
  role: string
  qualifications: string
  photo: string
  photoMedia?: string | number
  photoAlt: string
  bio: string
  profileUrl: string
  profileLinkText: string
  hidden: boolean
  order: number
  /** as on the public register, for example General Dentist or Oral Health Therapist */
  registrationType?: string
  /** AHPRA registration number, for example DEN0000958417; shown in the footer and on the team card */
  registrationNumber?: string
}

/** One before and after case on a treatment page. Shown only with every consent box ticked. */
export interface BeforeAfterCase {
  id: string
  page: string
  title: string
  before: string
  beforeMedia?: string | number
  beforeAlt: string
  after: string
  afterMedia?: string | number
  afterAlt: string
  caption: string
  consentDocumented: boolean
  consentDate: string
  consentRecord: string
  unedited: boolean
  consistentLighting: boolean
  published: boolean
  order: number
}

export interface HoursDay {
  day: string
  open: boolean
  opens: string
  closes: string
}

export interface Settings {
  practiceName: string
  logo: string
  logoMedia?: string | number
  phone: string
  email: string
  address: {
    unit: string
    street: string
    streetShort: string
    suburb: string
    state: string
    postcode: string
    latitude: number
    longitude: number
    mapEmbed: string
    /** shown after the street in brackets, for example "Corner of Brookes St"; left out of the schema */
    crossStreet?: string
  }
  parking: string
  /** one sentence for the footer and the contact section, for example "Located in Fortitude Valley, serving patients from ..." */
  serviceAreaLine?: string
  /** suburbs and areas for the schema's areaServed, separated by commas */
  areaServed?: string
  abn: string
  hours: HoursDay[]
  bookingUrl: string
  preferredFunds: string
  paymentAccepted: string
  socials: { facebook: string; instagram: string; youtube: string; linkedin: string; googleBusiness: string }
  colours: { navy: string; blue: string; blueDark: string }
  tracking: { ga4Id: string; gtmId: string; metaPixelId: string; googleAdsId: string; adsPriceListLabel: string }
  features: {
    mode: 'open' | 'pre-opening'
    emergencyDentistry: boolean
    cdbs: boolean
    zipAfterpay: boolean
    countdown: boolean
    countdownDate: string
  }
  offer: {
    enabled: boolean
    showBanner: boolean
    showPopup: boolean
    /** seconds before the pop-up shows; 0 shows it only when the visitor heads for the address bar */
    popupDelay: number
    title: string
    /** dollars, numbers only, for example 229 */
    price: string
    /** one inclusion per line */
    inclusions: string
    /** for example: Available from 15 October to 31 December 2026. Blank shows no dates. */
    period: string
    termsLine: string
    termsUrl: string
    /** full terms and conditions, paragraphs separated by a blank line */
    terms: string
    bookLabel: string
  }
  reviews: { enabled: boolean; rating: string; count: string; url: string; logo: string; logoMedia?: string | number }
  priceList: {
    /** the PDF, a site path or full URL */
    file: string
    fileDoc?: string | number
    /** who emails the PDF: SmileOx's automation, or the website itself through SMTP2GO */
    delivery: 'smileox' | 'website'
    buttonLabel: string
    consentText: string
    thankYou: string
  }
  schemes: { hicaps: boolean; cdbsBulkBill: boolean; dvaDirectBill: boolean }
  seoDefaults: { titleSuffix: string; description: string; ogImage: string; ogImageMedia?: string | number }
  imageReplacements: { from: string; to: string; media?: string | number }[]
}

export interface Chrome {
  head: string
  pre: string
  post: string
}

export interface Redirect {
  from: string
  to: string
  permanent: boolean
}

export interface Content {
  chrome: Chrome
  settings: Settings
  blocks: Record<string, Block>
  articleCta: string
  pages: Page[]
  posts: Post[]
  team: TeamMember[]
  redirects: Redirect[]
  beforeAfter: BeforeAfterCase[]
}
