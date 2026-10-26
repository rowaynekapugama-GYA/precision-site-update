/**
 * Map links and practice videos (client requests, 23 October 2026).
 *
 * Videos are the practice's own Vimeo uploads (data/videos.json), shown as click-to-play
 * cards: a poster image and a play button, with the Vimeo player only loaded when a visitor
 * presses play (public/assets/js/main.js), so the pages stay fast.
 */
import data from '../../data/videos.json'
import type { Settings } from './types'
import { attr, esc, ORIGIN, streetLine } from './util'

export interface Video { id: string; title: string; duration: number; patient: boolean; groups: string[]; poster: string; slug?: string; summary?: string; hidden?: boolean; libraryOrder?: number; category?: string; uploaded?: string }
const VIDEOS = (data as unknown as { videos: Video[]; disclaimer: string })

/** The Google Business listing: Site Settings > Social media > Google Business Profile, else a Maps search for the practice. */
export function listingUrl(s: Settings): string {
  const own = String(s.socials?.googleBusiness || '').trim()
  if (/^https?:\/\//i.test(own)) return own
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.practiceName}, ${s.address.suburb} ${s.address.state}`)}`
}

/** Directions to the practice listing (by name and the Google address, so Maps lands on the business). */
export function directionsUrl(s: Settings, address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.practiceName}, ${address}`)}`
}

const PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>'
const ROUTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 11 18-8-8 18-2-8-8-2z"/></svg>'

/** "View on Google Maps" and "Get directions" under the map, both to the practice listing. */
export function mapLinks(s: Settings): string {
  const a = s.address
  const address = `${streetLine(a)}, ${a.suburb} ${a.state} ${a.postcode}`
  return `<p class="map-links">` +
    `<a href="${attr(listingUrl(s))}" target="_blank" rel="noopener" data-track="map-listing">${PIN}View on Google Maps</a>` +
    `<a href="${attr(directionsUrl(s, address))}" target="_blank" rel="noopener" data-track="map-directions">${ROUTE}Get directions</a>` +
    `</p>`
}

const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>'

function mmss(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** One click-to-play video card (with the summary and an anchor on the Dental Videos page). */
export function videoCard(v: Video, withSummary = false): string {
  if (!/^\d+$/.test(v.id)) return ''
  const anchor = withSummary && v.slug && /^[a-z0-9-]+$/.test(v.slug) ? ` id="${attr(v.slug)}"` : ''
  const cat = withSummary && v.category ? ` data-cat="${attr(v.category)}"` : ''
  return `<figure class="lite-video"${anchor}${cat} data-vimeo="${attr(v.id)}" data-title="${attr(v.title)}">` +
    `<button type="button" class="lv-btn" aria-label="Play video: ${attr(v.title)}">` +
    (v.poster ? `<img src="${attr(v.poster)}" alt="" width="640" height="360" loading="lazy" decoding="async" onerror="this.remove()">` : '') +
    `<span class="lv-icon">${PLAY}</span>` +
    (v.duration ? `<span class="lv-time">${mmss(v.duration)}</span>` : '') +
    `</button><figcaption>${esc(v.title)}${withSummary && v.summary ? `<span class="lv-sum">${esc(v.summary)}</span>` : ''}</figcaption></figure>`
}

const CATEGORIES = ['Cosmetic', 'Invisalign', 'Implants', 'General', 'About Us']

/** Filter chips over the Dental Videos grid (All plus each category that has a video). */
function videoFilters(list: Video[]): string {
  const cats = CATEGORIES.filter((c) => list.some((v) => v.category === c))
  if (cats.length < 2) return ''
  const chip = (name: string, n: number, on: boolean) =>
    `<button type="button" class="filter-chip${on ? ' is-on' : ''}" data-vfilter="${attr(name)}" aria-pressed="${on}">${esc(name)}<span class="c">${n}</span></button>`
  return `<div class="gallery-filters video-filters" role="group" aria-label="Filter videos by topic">` +
    chip('All', list.length, true) + cats.map((c) => chip(c, list.filter((v) => v.category === c).length, false)).join('') + `</div>`
}

/** ISO 8601 duration for schema: 211 -> PT3M31S */
function isoDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `PT${m ? m + 'M' : ''}${s}S`
}

/** VideoObject nodes for the videos shown in a page's HTML (only those with an upload date). */
export function videoNodes(mainHtml: string): Record<string, unknown>[] {
  const ids = [...new Set([...String(mainHtml).matchAll(/data-vimeo="(\d+)"/g)].map((m) => m[1]))]
  return ids.map((id) => VIDEOS.videos.find((v) => v.id === id)).filter((v): v is Video => !!v && !!v.uploaded && !v.hidden)
    .map((v) => ({
      '@type': 'VideoObject',
      name: v.title,
      description: v.summary || v.title,
      thumbnailUrl: v.poster,
      uploadDate: v.uploaded,
      duration: isoDuration(v.duration),
      embedUrl: `https://player.vimeo.com/video/${v.id}`,
      publisher: { '@id': ORIGIN + '/#practice' },
    }))
}

/** The videos in a group as a grid, with the results disclaimer when any shows a patient. */
export function videoGrid(group: string): string {
  const library = group === 'library'
  const list = VIDEOS.videos.filter((v) => v.groups.includes(group) && !v.hidden)
  if (library) list.sort((x, y) => (x.libraryOrder ?? 999) - (y.libraryOrder ?? 999))
  if (!list.length) return ''
  const patient = list.some((v) => v.patient)
  return (library ? videoFilters(list) : '') +
    `<div class="video-grid video-grid-${list.length > 2 ? 'many' : list.length}${library ? ' video-library' : ''}">${list.map((v) => videoCard(v, library)).join('')}</div>` +
    (patient ? `<p class="video-note">${esc(VIDEOS.disclaimer)}</p>` : '')
}

/** Old website addresses of the video posts, each sent to its video on /dental-videos/ (next.config.mjs reads data/videos.json). */
export function videoRedirects(): { from: string; to: string }[] {
  return VIDEOS.videos.filter((v) => v.slug && v.groups.includes('library'))
    .map((v) => ({ from: `/${v.slug}`, to: v.hidden ? '/dental-videos/' : `/dental-videos/#${v.slug}` }))
}
