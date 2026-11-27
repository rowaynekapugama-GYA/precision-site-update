/**
 * The 3D tour on the Contact page (27 November 2026).
 *
 * The tour link lives in Site Settings (Virtual tour link). Only a Matterport share link is
 * accepted: the page never prints the pasted text, it reads the tour's ID out of the link and
 * builds the Matterport address itself, so a bad paste cannot put anything else on the page.
 * A blank link switches the whole section off.
 *
 * The tour loads only when a visitor presses the button (see main.js), so Matterport's
 * scripts and cookies reach nobody who has only opened the Contact page.
 */
import { attr, esc } from './util'

/** Matterport model IDs are short letters and numbers, for example hwCcZceUKup. */
const MODEL_ID = /^[A-Za-z0-9]{6,32}$/

/** The model ID from a Matterport share link, or '' when it is not one. */
export function matterportId(link: unknown): string {
  const raw = String(link ?? '').trim()
  if (!raw) return ''
  let u: URL
  try { u = new URL(raw) } catch { return '' }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return ''
  const host = u.hostname.toLowerCase()
  let id = ''
  // https://my.matterport.com/show/?m=ID (the Share button's link)
  if (host === 'my.matterport.com' && /^\/show\/?$/.test(u.pathname)) id = u.searchParams.get('m') || ''
  // https://discover.matterport.com/space/ID (the public listing page)
  else if (host === 'discover.matterport.com') id = /^\/space\/([A-Za-z0-9]+)\/?$/.exec(u.pathname)?.[1] || ''
  return MODEL_ID.test(id) ? id : ''
}

/** The link to open the tour on its own. */
export function tourShareUrl(id: string): string {
  return `https://my.matterport.com/show/?m=${id}`
}

/** Why a link is not accepted, or null when it is fine (blank is fine: the section is hidden). */
export function tourLinkProblem(link: unknown): string | null {
  if (!String(link ?? '').trim()) return null
  return matterportId(link) ? null : 'Paste the Matterport share link, for example https://my.matterport.com/show/?m=hwCcZceUKup'
}

/** Help line under the box in the dashboard. */
export const TOUR_HELP = 'The 3D tour on the Contact page. In Matterport, press Share and paste the link here (it starts with https://my.matterport.com/show/?m=). Leave it blank to hide the tour.'

/** Still photo of the practice shown until the tour is opened. */
export const TOUR_POSTER = '/assets/img/waiting.webp'
/** The same photo, 800 pixels wide, for phones. */
export const TOUR_POSTER_SMALL = '/assets/img/waiting-800.webp'

const CUBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/></svg>'

/** The click to load tour: a photo with a button, and a plain link for anyone the embed does not suit. */
export function tourBlock(link: unknown, poster = TOUR_POSTER): string {
  const id = matterportId(link)
  if (!id) return ''
  return `<div class="tour-frame tour-lite" data-tour="${attr(id)}" data-title="Virtual tour of Precision Dental">` +
    // phones get the smaller copy of the photo, so the page they came for loads no slower
    (poster === TOUR_POSTER
      ? `<img src="${attr(poster)}" srcset="${attr(TOUR_POSTER_SMALL)} 800w, ${attr(poster)} 1400w" sizes="(max-width: 1280px) calc(100vw - 40px), 1240px" alt="" width="1400" height="933" loading="lazy" decoding="async">`
      : `<img src="${attr(poster)}" alt="" width="1400" height="933" loading="lazy" decoding="async">`) +
    `<button type="button" class="tour-btn"><span class="tour-btn-label">${CUBE}<span>${esc('Start the 3D tour')}</span></span></button>` +
    `</div>` +
    `<p class="tour-alt"><a href="${attr(tourShareUrl(id))}" target="_blank" rel="noopener">${esc('Open the 3D tour in a new tab')}</a></p>`
}
