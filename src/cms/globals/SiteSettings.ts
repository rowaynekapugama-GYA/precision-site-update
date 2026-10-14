import type { GlobalConfig } from 'payload'
import { adminField, loggedIn } from '../access'
import { markGlobalChanged } from '../hooks'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Practice details, hours, links, brand colours, tracking and feature switches. */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  admin: { group: 'Settings' },
  access: { read: loggedIn, update: loggedIn },
  hooks: { afterChange: [markGlobalChanged] },
  fields: [
    { name: 'practiceName', type: 'text', defaultValue: 'Precision Dental' },
    { name: 'logo', type: 'text' },
    { name: 'logoMedia', type: 'upload', relationTo: 'media' },
    { name: 'phone', type: 'text' },
    { name: 'email', type: 'text' },
    {
      name: 'address', type: 'group', fields: [
        { name: 'unit', type: 'text' },
        { name: 'street', type: 'text' },
        { name: 'streetShort', type: 'text' },
        { name: 'suburb', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'postcode', type: 'text' },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'mapEmbed', type: 'text' },
      ],
    },
    { name: 'parking', type: 'text' },
    { name: 'abn', type: 'text' },
    {
      name: 'hours', type: 'array', maxRows: 7, fields: [
        { name: 'day', type: 'select', options: DAYS },
        { name: 'open', type: 'checkbox' },
        { name: 'opens', type: 'text' },
        { name: 'closes', type: 'text' },
      ],
    },
    { name: 'bookingUrl', type: 'text' },
    { name: 'preferredFunds', type: 'text' },
    { name: 'paymentAccepted', type: 'text' },
    {
      name: 'socials', type: 'group', fields: [
        { name: 'facebook', type: 'text' },
        { name: 'instagram', type: 'text' },
        { name: 'youtube', type: 'text' },
        { name: 'linkedin', type: 'text' },
        { name: 'googleBusiness', type: 'text' },
      ],
    },
    {
      name: 'colours', type: 'group', fields: [
        { name: 'navy', type: 'text' },
        { name: 'blue', type: 'text' },
        { name: 'blueDark', type: 'text' },
      ],
    },
    {
      name: 'tracking', type: 'group', access: { read: adminField, update: adminField, create: adminField },
      fields: [
        { name: 'ga4Id', type: 'text' },
        { name: 'gtmId', type: 'text' },
        { name: 'metaPixelId', type: 'text' },
        { name: 'googleAdsId', type: 'text' },
        { name: 'adsPriceListLabel', type: 'text' },
      ],
    },
    {
      name: 'features', type: 'group', fields: [
        { name: 'mode', type: 'select', options: ['open', 'pre-opening'], defaultValue: 'open' },
        { name: 'emergencyDentistry', type: 'checkbox', defaultValue: true },
        { name: 'cdbs', type: 'checkbox', defaultValue: false },
        { name: 'zipAfterpay', type: 'checkbox', defaultValue: false },
        { name: 'countdown', type: 'checkbox', defaultValue: false },
        { name: 'countdownDate', type: 'text' },
      ],
    },
    {
      name: 'offer', type: 'group', fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: false },
        { name: 'showBanner', type: 'checkbox', defaultValue: true },
        { name: 'showPopup', type: 'checkbox', defaultValue: true },
        { name: 'popupDelay', type: 'number', defaultValue: 20 },
        { name: 'title', type: 'text' },
        { name: 'price', type: 'text' },
        { name: 'inclusions', type: 'textarea' },
        { name: 'period', type: 'text' },
        { name: 'termsLine', type: 'text' },
        { name: 'termsUrl', type: 'text' },
        { name: 'terms', type: 'textarea', maxLength: 20000 },
        { name: 'bookLabel', type: 'text' },
      ],
    },
    {
      name: 'reviews', type: 'group', fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: false },
        { name: 'rating', type: 'text' },
        { name: 'count', type: 'text' },
        { name: 'url', type: 'text' },
        { name: 'logo', type: 'text' },
        { name: 'logoMedia', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'priceList', type: 'group', fields: [
        { name: 'file', type: 'text' },
        { name: 'fileDoc', type: 'upload', relationTo: 'documents' },
        { name: 'delivery', type: 'select', options: ['smileox', 'website'], defaultValue: 'smileox' },
        { name: 'buttonLabel', type: 'text' },
        { name: 'consentText', type: 'textarea' },
        { name: 'thankYou', type: 'textarea' },
      ],
    },
    {
      name: 'schemes', type: 'group', fields: [
        { name: 'hicaps', type: 'checkbox', defaultValue: false },
        { name: 'cdbsBulkBill', type: 'checkbox', defaultValue: false },
        { name: 'dvaDirectBill', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      name: 'seoDefaults', type: 'group', fields: [
        { name: 'titleSuffix', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'ogImage', type: 'text' },
        { name: 'ogImageMedia', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'imageReplacements', type: 'array', fields: [
        { name: 'from', type: 'text', required: true },
        { name: 'to', type: 'text' },
        { name: 'media', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
