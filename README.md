# Precision Dental - Homepage (Vercel deploy)

Static homepage for **precisiondentistry.com.au**, built by GYA. This is the approved-direction prototype packaged for a Vercel staging deploy so the client can review it on a real URL.

**What this is:** the homepage only, as a static site with one serverless function for the enquiry form.
**What this is not:** the full 51 page site on the GYA Site Kit (Next.js App Router + Payload CMS at /admin + Neon Postgres + Vercel Blob). That comes once the design is signed off. See *Next phase* below.

---

## Deploy

### Option A: GitHub (recommended)
1. Create a private repo, e.g. `precision-dental-web`.
2. Upload the contents of this folder to the repo root (`index.html` must sit at the root, not inside a subfolder).
3. In Vercel: **Add New > Project > Import** the repo.
4. Framework preset: **Other**. Build command: leave empty. Output directory: leave empty (root).
5. Add the environment variables below, then **Deploy**.

### Option B: CLI
```bash
npm i -g vercel
cd precision-dental-web
vercel            # preview
vercel --prod     # production
```

### Environment variables
Set these in Vercel under **Settings > Environment Variables** (Production and Preview).

| Name | Required | Value |
|---|---|---|
| `SMTP2GO_API_KEY` | yes | SMTP2GO API key for the sending domain |
| `ENQUIRY_FROM` | no | From-address, must be on an SMTP2GO-verified domain. Defaults to `website@precisiondentistry.com.au` |
| `ENQUIRY_RECIPIENTS` | no | Extra recipients, comma separated. Use this for the client's SmileOx intake address once we have it |

`admin@precisiondentistry.com.au` and `rowayne@gyaclients.com` are hard-coded as fallback recipients in `api/enquiry.js`, so the form still reaches someone if the env var is missing.

The form returns a clear on-page error and asks the visitor to phone if the key is not set, so a missing key never fails silently.

---

## What is in the box

```
index.html              homepage
404.html                branded not-found page (Vercel serves this automatically)
vercel.json             clean URLs, caching, security headers, staging noindex
robots.txt              production robots (allows crawling, points at the sitemap)
sitemap.xml             homepage only for now, regenerate when pages are added
api/enquiry.js          serverless function, relays the enquiry form via SMTP2GO
assets/css/styles.css   all styles
assets/js/main.js       menu, accordions, scroll reveals, video control, form submit
assets/img/             logos, section photos, 35 menu thumbnails, favicon, OG image
assets/video/hero.mp4   hero background video, 1.5MB
CHANGELOG.md
```

### Staging is noindex by default
`vercel.json` sends `X-Robots-Tag: noindex, nofollow` on any `*.vercel.app` host, so the staging URL cannot compete with the live site. The custom domain is unaffected and indexes normally. Nothing to switch on at go-live.

### Caching
Everything under `/assets/` is served `immutable` for a year. Change a file name if you replace an asset, or the browser will keep the old one.

---

## Go-live checklist

**Blocked until the client answers**
- [ ] **Principal's name.** The scrubs in the team photo read "Dr. Billy Chun". The copy doc, meta titles, schema and the existing URL all say "Dr Billy Choi". One is wrong and it affects the URL.
- [ ] **Booking URL.** Confirm `https://booking.au.hsone.app/soe/new/Precision%20Dental?pid=AUSHC01` is current. The old site header has two different booking domains.
- [ ] **Media consent** for every recognisable patient in the hero video.
- [ ] **SmileOx intake address** for the enquiry form.
- [ ] **Social profile URLs** for the footer and the `sameAs` schema. The footer icons are currently `#`.
- [ ] **Dr Choi's Dental Board registration number** for his profile page.

**Before pointing DNS**
- [ ] Add the domain in Vercel, apex as primary with `www` 308 redirecting.
- [ ] Swap GA4 and Meta Pixel IDs in, and confirm GTM `GTM-NFTDF44` fires click-to-call and Book Online. The dataLayer already pushes `click_to_call` and `book_online_click`.
- [ ] Send a test enquiry and confirm it lands at reception, SmileOx and rowayne@gyaclients.com.
- [ ] Validate the Dentist and FAQPage schema in Google's Rich Results Test.
- [ ] Re-check phone, address, hours and health funds against the brief.
- [ ] Regenerate the sitemap once the other pages exist, then resubmit in Search Console.

**Known gaps in this build**
- Only the homepage exists. Every nav and footer link to another page will hit the 404 page until those pages are built.
- The seven About dot points from the copy doc are not on the page. They were removed on request, and the developer instructions ask for them as an icon checklist. Awaiting a decision.
- Menu thumbnails use the practice's own photos. Whitening, mouthguards, wisdom teeth and CEREC have no matching photo and reuse a near-enough one.
- The hero video is embedded at 1440x810. If the client supplies the original at higher quality we can re-encode.

---

## Compliance notes

The copy is implemented verbatim from `Precision_Dental_Website_Copy.docx`. Do not rewrite it.

- No testimonials, review counts, star ratings or award badges anywhere.
- No "best", "expert", "guaranteed" or "pain-free" in copy, navigation or UI microcopy.
- Invisalign carries the ® and SmileView the ™ on first mention, which the menu satisfies on every page.
- Australian English throughout. No em dashes.
- Service pages will need the general disclaimer, and the surgical risk statement on the pages listed in the developer instructions.
- `/treatment-risks/` stays and must be linked in the footer. It already is.

---

## Next phase

Once the design is signed off, this becomes the GYA Site Kit build:

- Next.js App Router, private GitHub repo, Vercel.
- Payload CMS at `/admin` so the client can edit wording, swap images, set per-page SEO, publish posts and reorder sections.
- Neon Postgres, media on Vercel Blob.
- Remaining 50 pages from the copy doc, the 301 map, breadcrumbs, related services module, and the global CTA, fees, disclaimer and risk modules.
- Images pre-compressed to WebP with `next/image` `unoptimized: true`.

The design system in `assets/css/styles.css` carries straight over: the palette is defined as custom properties on `:root`, and the section badge, button, card and accordion patterns are all reusable.
