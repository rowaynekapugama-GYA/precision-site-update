/**
 * Map links and practice videos (client requests, 23 October 2026).
 *
 * Videos are the practice's own Vimeo uploads (data/videos.json), shown as click-to-play
 * cards: a poster image and a play button, with the Vimeo player only loaded when a visitor
 * presses play (public/assets/js/main.js), so the pages stay fast.
 */
import data from '../../data/videos.json'
import type { Settings } from './types'
import { attr, esc, streetLine } from './util'

export interface Video { id: string; title: string; duration: number; patient: boolean; groups: string[]; poster: string }
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

/** One click-to-play video card. */
export function videoCard(v: Video): string {
  if (!/^\d+$/.test(v.id)) return ''
  return `<figure class="lite-video" data-vimeo="${attr(v.id)}">` +
    `<button type="button" class="lv-btn" aria-label="Play video: ${attr(v.title)}">` +
    (v.poster ? `<img src="${attr(v.poster)}" alt="" width="640" height="360" loading="lazy" decoding="async" onerror="this.remove()">` : '') +
    `<span class="lv-icon">${PLAY}</span>` +
    (v.duration ? `<span class="lv-time">${mmss(v.duration)}</span>` : '') +
    `</button><figcaption>${esc(v.title)}</figcaption></figure>`
}

/** The videos in a group as a grid, with the results disclaimer when any shows a patient. */
export function videoGrid(group: string): string {
  const list = VIDEOS.videos.filter((v) => v.groups.includes(group))
  if (!list.length) return ''
  const patient = list.some((v) => v.patient)
  return `<div class="video-grid video-grid-${list.length > 2 ? 'many' : list.length}">${list.map(videoCard).join('')}</div>` +
    (patient ? `<p class="video-note">${esc(VIDEOS.disclaimer)}</p>` : '')
}
