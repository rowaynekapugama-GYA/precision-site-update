# Precision Dental: the client dashboard (v3.1.3)

The Precision Dental website (precisiondentistry.com.au) now has a dashboard at **/admin**.
The practice can sign in, change wording and photos, reorder sections, write blog posts, update
practice details and SEO, read enquiries, and press **Publish website** to put it all live.

This is a **retrofit, not a rebuild**. Every page, address and design is the approved 9 October 2026
release. The public site is still fully static: visitors are served plain HTML files, and nothing
on a public page reads the database.

- For practice staff: `docs/HOW-TO-UPDATE.md`
- What changed and when: `CHANGELOG.md`
- v3.1.0 (14 October 2026) adds the $229 new patient offer, the gated price list with SmileOx, the
  Health Funds and Government Schemes page, AHPRA registration lines, the reviews badge (off) and
  before and after galleries. See "v3.1.0: the 14 October revisions" below.

---

## How it works

```
editor saves in /admin  ->  Neon Postgres  ->  "Publish website"  ->  Vercel deploy hook
                                                                           |
                       npm run build (scripts/build.mjs):                  v
                         1. payload migrate        (database tables up to date)
                         2. seed-admin             (first GYA account, once)
                         3. content-updates        (this release's page changes, once per database)
                         4. pull-content           (database -> content/*.json)
                         5. render-site            (content/*.json -> public/*.html)
                         6. next build             (dashboard, /cms, API routes)
```

- **If the database is down, empty or not configured, steps 1 to 4 are skipped** and the site is built
  from the JSON committed in the repo. The live site cannot break because of the dashboard.
- `content/` is the site's content model: one JSON file per page and per post, plus settings, team,
  shared sections and the shared header and footer (`content/chrome.json`). It was made from the
  approved HTML, and rendering it gives back all 125 pages, `sitemap.xml` and `robots.txt` **byte for
  byte**. `npm run qa:parity -- <folder of the 9 Oct release>` proves it.
- Each page section is stored as its own HTML with every editable value replaced by a placeholder,
  plus the values (Heading, Paragraph, Photo, Button link). Untouched sections render exactly as
  before; the dashboard shows named fields, never raw HTML.
- Practice details are placeholders too (`{{site:phone}}`, shown to staff as `{phone}`). The phone
  number appeared in about 1,200 places and the booking link in 615; each is now changed once in
  Site Settings.
- Blog posts, the Dental Articles index, the HTML sitemap's article column, `sitemap.xml`, the
  BlogPosting, Breadcrumb, FAQPage and Dentist schema and the Meet the Team cards are generated from
  the database at build time, with the same markup the approved build used.
- `src/middleware.ts` serves the static pages the way the old `vercel.json` did: `/about-us` and
  `/about-us.html` redirect (308) to `/about-us/`, which serves `public/about-us.html`; unknown
  addresses get the site's own 404 page with a 404 status. Redirects added in the dashboard are
  applied here.

### Where things are

```
content/                 the site's content (JSON); the build overwrites it from the database
src/render/              turns content/ into HTML (pure TypeScript, used by the build and the preview)
src/cms/                 Payload: collections, Site Settings, access rules, import and pull (sync.ts)
src/dashboard/           the /admin dashboard: screens, editors, styles
src/app/(dashboard)/     /admin routes        src/app/(payload)/   Payload's own admin at /cms (GYA only)
src/app/api/enquiry/     the enquiry form relay (SMTP2GO), now also saves each enquiry
src/app/api/dashboard/   publish, import, CSV export, password change
src/middleware.ts        clean URLs, trailing slash, 404, dashboard redirects
scripts/                 build.mjs, pull-content.ts, render-site.ts, seed.ts, seed-admin.ts, push-to-github.sh, qa/
migrations/              database schema (committed; the build runs them)
public/assets/           the site's CSS, JS and photos (unchanged)
tools/extract-static-site/  the one-off script that made content/ from the approved HTML (kept for the record)
```

---

## Setting it up on Vercel (one time)

The Vercel project and GitHub repo stay the same (`rowaynekapugama-GYA/precision-site-update`).
`vercel.json` now tells Vercel this is a Next.js build, so **leave the project's Framework Preset and
build settings alone**. If you ever roll back to the static release, the old settings are what it needs.

1. **Database.** Vercel > the project > Storage > Create > **Neon** (Postgres). Connect it to the
   project for Production and Preview. This adds `DATABASE_URL`.
   The Neon integration usually gives Preview deployments **their own database branch**. That means
   the first sign in and Import on the preview do not carry over to production; you do both again
   after going live (step 4 of the rollout).
2. **Media storage.** Storage > Create > **Blob**. Connect it to the project (Production and Preview).
   This adds `BLOB_READ_WRITE_TOKEN`. Without it, uploads would vanish between deployments.
3. **Publish hook.** Settings > Git > Deploy Hooks > create one called `dashboard-publish` on branch
   `main`. Copy the URL into `PUBLISH_HOOK_URL` (Production). For testing on the preview, make a
   second hook on branch `cms` and put it in `PUBLISH_HOOK_URL` for Preview only.
4. **Environment variables** (Settings > Environment Variables):

| Variable | Where | Value |
|---|---|---|
| `DATABASE_URL` | Production, Preview | Added by the Neon integration |
| `BLOB_READ_WRITE_TOKEN` | Production, Preview | Added by the Blob integration |
| `PAYLOAD_SECRET` | Production, Preview | A long random string: `openssl rand -hex 32`. Mark it Sensitive. Changing it signs everyone out. |
| `PUBLISH_HOOK_URL` | Production (main hook), Preview (cms hook) | From step 3. Mark it Sensitive. |
| `NEXT_PUBLIC_SERVER_URL` | Production | `https://precisiondentistry.com.au` (leave it unset on Preview; previews use their own address) |
| `SEED_ADMIN_EMAIL` | Production, Preview | `rowayne@gyaclients.com` |
| `SEED_ADMIN_PASSWORD` | Production, Preview | The first-login password GYA agreed for this site. Mark it Sensitive. It is only ever in Vercel, never in the repo or a file. |
| `SMTP2GO_API_KEY` | Production, Preview | Already set for the enquiry form |
| `ENQUIRY_FROM` | optional | From-address on an SMTP2GO-verified domain (default `website@precisiondentistry.com.au`) |
| `ENQUIRY_RECIPIENTS` | optional | Extra recipients for the enquiry form, comma separated |
| `SMILEOX_INTAKE_EMAIL` | Production, Preview | The practice's SmileOx intake address. Every enquiry and every price list request is emailed to it (v3.1.0). |
| `SMILEOX_WEBHOOK_URL` | optional | A SmileOx webhook for price list requests, if SmileOx provides one: the lead is posted as JSON with `tags: ["Price List Download"]`, the lead source and the UTM tags |
| `SMILEOX_WEBHOOK_SECRET` | optional | Sent as `Authorization: Bearer ...` to the webhook. Mark it Sensitive. |
| `PRICE_LIST_RECIPIENTS` | optional | Extra recipients for price list requests (defaults to `ENQUIRY_RECIPIENTS`) |

Optional: `ALLOW_FIRST_USER=true` reopens Payload's "create first user" screen at /cms (keep it off),
`EXTRA_ORIGINS` adds dashboard addresses beyond the ones Vercel provides.

The first administrator (`rowayne@gyaclients.com`, role Administrator) is created by the build from
`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. It only ever creates: if the account exists nothing
happens, so a password changed in the dashboard is never reset. The account **must choose a new
password at its first sign in**. Once production has been signed into, `SEED_ADMIN_PASSWORD` can be
deleted from Vercel.

---

## Rollout: stage on `cms`, test, then promote

Rowayne deploys from Terminal with `scripts/push-to-github.sh` (the same tool as Cronulla and
Footscray). It always works in a fresh clone under `~/gya-deploy`.

> Do **not** use the old static `deploy-precision.sh` or GitHub's web uploader for this release: a
> retrofit is a whole-repo change (it removes `api/enquiry.js` and adds the app), and the old script
> would put the static files back.

1. **Stage.** Download `precision-dental-site-cms-v3.0.0.zip`, unzip it anywhere, then:
   ```bash
   bash precision-dental-site/scripts/push-to-github.sh stage ~/Downloads/precision-dental-site-cms-v3.0.0.zip
   ```
   It builds the `cms` branch from what is live on `main`, replaces every file with the release,
   lists what is removed, refuses a release containing a `.env`, asks for `yes`, and force-pushes
   `cms` only. Vercel builds a **preview**; the live site is untouched.
2. **Check the preview** (Vercel > Deployments > the `cms` build):
   - the public pages look exactly as they do now;
   - `/admin` > sign in as `rowayne@gyaclients.com` with the seed password > choose a new password;
   - Dashboard > **Import** (loads the site into the dashboard; safe to run again);
   - edit something small, Save, **Preview**, then **Publish website** (with the cms hook set) and
     see it appear on the preview after the rebuild;
   - send a test enquiry from `/contact/` and see it under Enquiries and in the inboxes.
3. **Promote.**
   ```bash
   bash precision-dental-site/scripts/push-to-github.sh status     # what is live, what is staged
   bash precision-dental-site/scripts/push-to-github.sh promote    # type LIVE
   ```
   `promote` refuses if anything was pushed to `main` after staging (someone used the web uploader),
   and fast-forwards `main` without a force push. The previous `main` is recorded.
4. **On production:** `/admin` > sign in with the seed password > choose a new password > **Import**
   > **Publish website** once. Then create the practice's editor accounts under **Users**.
5. **If anything is wrong:** `bash precision-dental-site/scripts/push-to-github.sh rollback` (type
   `ROLLBACK`) puts `main` back to the static release.

---

## Roles

| | Administrator (GYA) | Editor (practice) |
|---|---|---|
| Pages, Blog Posts, Media Library, Team, Enquiries, SEO, Site Settings, Publish | Yes | Yes |
| Tracking IDs (GTM, GA4, Meta Pixel) | Yes | Hidden in the dashboard and in the API |
| Redirects, Users | Yes | Not in the menu; the pages return 404; the API refuses |
| Payload's own admin at /cms, Import | Yes | Refused |

Accounts are created by an administrator from **Users** with a temporary password; the person must
choose their own at first sign in. Nobody can register. `/cms/create-first-user` returns 404 and the
API refuses a first-user registration unless `ALLOW_FIRST_USER=true`.

## Local development

```bash
npm install
cp .env.example .env          # DATABASE_URL to a local Postgres, PAYLOAD_SECRET, SEED_ADMIN_*
npm run migrate               # create the tables
npm run seed:admin            # first administrator from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
npm run seed                  # same as Import: load content/ into the database
npm run render && npm run dev # http://localhost:3000 and http://localhost:3000/admin
```

`npm run build` runs the whole Vercel build. `npm run pull` copies the database into `content/`.

## Changing the code

- **Adding a field to a collection:** add it, then `npm run migrate:create <name>` and `npm run migrate`.
  Migrations are committed; the build runs them. With `push: false`, a field without a migration
  makes the dashboard error with "column does not exist".
- **Changing the header, footer or menu:** they live in `content/chrome.json` (shared by every page
  except Home and the 404 page, which keep their own in their page file). Edit the JSON, run
  `npm run render`, check, commit.
- **Changing the design:** `public/assets/css/styles.css` and `public/assets/js/main.js` as before.
- **Content edits by GYA** are made in the dashboard like the practice does. The old Python build
  scripts no longer drive the site; `content/` does.

## Verification run for this release (9 October 2026)

- `npm run typecheck` clean. `npm run build` passes with `DATABASE_URL`, without it, and with
  `VERCEL_ENV=preview` on an empty database (the first-deploy path: migrations ran, the first
  administrator was created, the pull was skipped and the repo JSON used).
- Fresh database: migrations from scratch, `migrate:create` reports no schema changes, then
  seed > pull > diff against `content/`: **zero differences across 131 files**.
- Rendering `content/` against the 9 October release: **127 of 127 files identical** (125 pages,
  `sitemap.xml`, `robots.txt`). Build from files vs build from the database: **127 of 127 identical**.
- Served by `next start`: all 124 pages, `sitemap.xml`, `robots.txt` and the 404 page (with a 404
  status) are byte for byte the files of the 9 October release, with the same security, caching and
  staging noindex headers. In Chromium at 1280 and 390, nine pages (Home, About, Porcelain Veneers,
  Contact, an article, Dental Articles, Our Team, Prices, a suburb page) show identical page heights
  and **0.000% differing pixels** against the 9 October static site.
- Every dashboard function driven in a real browser against the production build made from this zip
  in a clean folder (`npm ci`, fresh database), signed in as rowayne@gyaclients.com (46 of 46
  checks): first sign in and forced password change, Import and reset, Site Settings (phone,
  preferred funds, Friday hours, Facebook, GTM), Media Library upload, alt text, replace, website
  photo replaced everywhere, page edit with a library photo and a `{phone}` placeholder, section
  reorder and hide, SEO tab and SEO overview, Team add, hide, reorder and remove, a blog post with
  headings, a list, a link, an inline photo, the Book/Call buttons, a category and an FAQ,
  published, unpublished and republished, Preview, an enquiry from the live form logged with its
  page and exported to CSV, a redirect, a new editor account, Publish with the hook. Editor role: no
  Users, Redirects or tracking IDs, 404 at those screens, refused at /cms and by the API. Signed
  out: no preview, no first-user registration.
- After publishing those edits, the rebuilt site carried them everywhere: the new phone number on
  every page (0 left of the old one), the new Friday hours in the footer, the Book Your Visit band,
  the contact page and the Dentist schema, the Facebook link, GTM on every page, the replaced photo
  in every page and menu, the new post on Dental Articles, `sitemap.xml`, the HTML sitemap and with
  BlogPosting and FAQPage schema, and the redirect added in the dashboard answered with a 308.
- `npm run qa:banned` clean (em dashes, AHPRA claim words, urgency wording, testimonial components).
  `npm run qa:secrets` clean on the release, including a search for the seed password, which is only
  in the environment.
- `scripts/push-to-github.sh` tested against a local bare repo: declined stage, stage, status,
  wrong-word promote, promote, rollback, re-stage, the main-moved guard and a release with a `.env`.

---

## v3.1.0: the 14 October revisions

### What was added, and where it is edited

| Revision | On the website | Edited in |
|---|---|---|
| $229 new patient offer | Strip under the homepage hero; main panel on `/new-patients/`; centred pop-up on every other page (v3.1.1: opens 2 s after the first page of a visit, once per visit; closes with X, Esc or a click outside; keyboard kept inside while open); terms page `/new-patient-offer-terms/` (noindex) | Site Settings > New patient offer (price, inclusions, period, terms line, full terms, button wording, which placements show, pop-up delay) |
| Price list form | Homepage section, `/new-patients/`, and inside "Download Our Price List" on `/price-list/` (`#price-list`); footer button on every page links there | Site Settings > Price list (PDF, who emails it, button, consent, thank-you) |
| Health Funds and Government Schemes | `/health-funds/`, Patients menu, footer, HTML sitemap, homepage CDBS and health fund cards, CDBS and DVA sections of `/price-list/` | Pages > Health Funds and Government Schemes; the three "only if confirmed" lines in Site Settings > Health funds and government schemes |
| AHPRA registration | Footer of every page, Dr Choi's profile ("Registration" row), his Meet the Team card | Team (registration type and number); his profile's row in Pages |
| Google reviews band (v3.1.2) | "Over 500 Google Reviews" band under the homepage offer strip, linked to Google; stars when a rating is entered | Site Settings > Google reviews band (on, 500 reviews, no rating yet) |
| Before and after | A collapsed gallery on 11 treatment pages, absent until a case is ready | Before & After (new screen) |

### The price list and SmileOx

1. The visitor fills in first name, last name, email, mobile (Australian mobile, checked in the browser
   and on the server) and ticks consent. A hidden field catches bots.
2. `POST /api/price-list` (`src/app/api/price-list/route.ts`):
   - emails the lead to `SMILEOX_INTAKE_EMAIL`, reception and rowayne@gyaclients.com through SMTP2GO,
     subject `Price List Download: <name>`, one `Label: value` per line: names, email, mobile,
     `Tag: Price List Download`, `Lead source` (for example `google / cpc`), the form and page, every
     UTM tag and click ID present (gclid, gbraid, wbraid, fbclid, msclkid), the landing page, the
     referrer and the consent time;
   - posts the same lead as JSON to `SMILEOX_WEBHOOK_URL` when set;
   - saves it to Enquiries (type "Price list", with the lead source and what SmileOx was sent);
   - when Site Settings says the website sends the price list, emails the visitor a link to the PDF.
3. The page shows the thank-you message and fires `dataLayer` `price_list_download`, GA4
   `generate_lead`, the Google Ads conversion (Site Settings > Tracking: Ads ID and label) and Meta `Lead`.
   Offer buttons push `offer_cta_click`, the pop-up `offer_popup_shown` and `offer_popup_closed`.
4. Campaign details are kept from the visitor's landing page for 90 days (`public/assets/js/leads.js`),
   so a visitor who lands from an ad and asks for the price list three pages later is still credited.

**SmileOx automation to set up (GYA):** when a contact is tagged "Price List Download", email them the
price list PDF. Until the practice sends the PDF, either leave the form as it is (requests are still
captured) or switch Site Settings > Price list to "The website" once the PDF is uploaded there.

### Sites already in the dashboard (content updates)

A site imported into the dashboard is built from the database, so new sections in this release have to
reach the database too. `scripts/content-updates.ts` runs in every build, before the pull, and applies
each update in `src/content/updates.ts` once per database, recording it in `site-status.appliedUpdates`:
it adds the three new pages, the homepage banner, badge slot and price list section, the price list form
on `/price-list/`, the menu and footer on the homepage's own header and footer, Dr Choi's registration,
the before and after sections, the sitemap links, the Team registration and the offer settings. Each step
checks first, so nothing is added twice, and a change the practice makes afterwards is never undone.
Verified: a database seeded from v3.0.0 and built with v3.1.0 pulls back exactly the v3.1.0 `content/`
(every file identical).

For GYA when writing the next release: add an update to `UPDATES` with a new id, run
`npx tsx scripts/content-updates.ts --files` to apply it to `content/`, and commit both.

### Verification run for v3.1.2 (15 October 2026)

- From the unzipped v3.1.2 release (`npm ci`): a database seeded from v3.0.0 and built with v3.1.2 pulls
  back exactly `content/`, with the reviews band switched on.
- Chromium: 71 checks for the 14 and 15 October features (63 before publishing, 8 after), including the
  band under the offer strip, its Google link in a new tab, no stars without a rating, stars and 4.9 once
  a rating is entered, and the dashboard refusing a rating outside 1 to 5. The v3.0.0 dashboard drive:
  46 of 46.

### Verification run for v3.1.1 (15 October 2026)

- From the unzipped v3.1.1 release (`npm ci`): a database seeded from v3.0.0 and built with v3.1.1 pulls
  back exactly `content/`; a v3.1.0 database gets the 2 second pop-up delay from the new content update.
- Chromium, 69 checks for the 14 October features, including the centred pop-up: opens on the first page,
  centred, modal with focus inside, page behind locked, keyboard kept inside, closes with Esc, a click
  outside and the X, once per visit, fits a 390 px phone with both buttons in view. The v3.0.0 drive of
  every dashboard function still passes 46 of 46.

### Verification run for v3.1.0 (14 October 2026)

- `tsc --noEmit` clean; `qa:banned` and `qa:secrets` (including the seed password) clean.
- Rendered against the 9 October release: the only differences on the 124 existing pages are the menu
  items, the footer (registration line, links, price list button), the pop-up markup and `leads.js`;
  plus the intended changes on the homepage, `/price-list/`, Dr Choi's profile, Meet the Team, the
  HTML sitemap and `sitemap.xml`. The 11 treatment pages with an empty gallery are otherwise
  byte for byte the same.
- Database: fresh seed, pull, diff = zero; v3.0.0 database upgraded (migration, content updates), pull,
  diff = zero; content updates run a second time = nothing to do.
- Production build (`next start`) with SMTP2GO and the SmileOx webhook mocked, in Chromium, 63 checks:
  offer strip, pop-up timing, once per visit, size and position at 1440 and 390, page skip; price list
  validation (mobile, consent, server-side consent, honeypot, GET refused), thank-you, events, the email
  (recipients, tag, lead source, UTM, gclid) and webhook (tag, UTM, bearer token); Health Funds content
  and hidden lines; terms noindex; sitemap; Enquiries filter and lead source; Settings validation
  (urgency wording, badge needs rating and link); Team registration; Before & After (not shown without
  consent, shown with it); uploaded photo visible to a signed-out visitor; Publish calls the hook; after
  publishing, the badge, period, Ads tag, gallery with risk statement, HICAPS switch and terms. All 63 pass
  from the unzipped release built with `npm ci` against a database seeded from v3.0.0, and the v3.0.0
  drive of every dashboard function still passes 46 of 46.


## Where the site and the brief disagree (check before go-live)

| Item | Brief or standard | The site | Decision or action |
|---|---|---|---|
| **v3.1.0: $229 offer terms and period** | Offers must state price, inclusions and the period; terms from the practice | Price and inclusions shown; terms page shows a marked placeholder and "Offer period: To be confirmed" | **Before go-live:** the practice confirms the terms and the dates (or that it is ongoing). Enter both in Site Settings > New patient offer. |
| **v3.1.0: price list PDF** | SmileOx emails the PDF | No PDF yet. Requests are captured, emailed to SmileOx, reception and GYA and listed in Enquiries | Get the PDF from the practice; set up the SmileOx automation on the "Price List Download" tag (or upload it in Site Settings and choose "The website"). |
| **v3.1.0: SmileOx intake address** | All new forms feed SmileOx with source tracking | Built for `SMILEOX_INTAKE_EMAIL` (and an optional webhook) | Set `SMILEOX_INTAKE_EMAIL` in Vercel before go-live, and `SMILEOX_WEBHOOK_URL` if SmileOx gives one. Confirm SmileOx maps the `Label: value` lines (Tag, Lead source, utm_*). |
| **v3.1.0: price list copy** | "SmileOx emails the price list" | The approved Prices page says "we will send it to your mobile and email" | Confirm whether SmileOx also sends it by SMS; if not, change "your mobile and email" to "your email" in Pages > Prices and Payment Options. |
| **v3.1.2: Google reviews** | Confirm the rating from the Google Business Profile; client sign-off | The practice asked for the 500 reviews to be highlighted (15 Oct), so the band is on with "Over 500". No star rating or Google logo yet, and the link opens a Google Maps search for the practice | Enter the star rating as Google shows it, the Google Business Profile link, and upload Google's official logo file (Site Settings > Google reviews band). |
| **v3.1.0: HICAPS** | Mention on-the-spot claiming only if the practice confirms it | The new page's HICAPS line is off. **The approved pages already say HICAPS**: the homepage hero chip "HICAPS on the spot", the homepage health fund card, the "Health Fund Claims with HICAPS" section and SEO description of Prices and Payment Options | Ask the practice. If HICAPS is not available, remove those mentions (Pages > Home, Prices and Payment Options). If it is, switch the line on. |
| **v3.1.0: CDBS bulk billing, DVA billing** | Add only if confirmed | Both lines built and off | Switch on in Site Settings once the practice confirms. |
| **v3.1.0: Dr Choi's registration** | "Dr Billy Choi – General Dentist – AHPRA Registration: DEN0000958417"; confirm the number | Shown as "Dr Billy Choi, General Dentist, AHPRA Registration: DEN0000958417" (commas in place of the dashes, house style). Not found in a web search, so not independently checked | Check DEN0000958417 on the AHPRA public register before go-live. |
| **v3.1.3: other practitioners** | AHPRA numbers for other clinicians, from the practice | Ivan Yang (DEN0004030046) and Mobina Rezayee (DEN0004029897), Dental Hygienists, added on 16 October: footer and Meet the Team. Their cards have initials until photos and bios are supplied | Photos (with approval) and short bios for Ivan and Mobina, entered under Team. Lizzy (Oral Health Therapist) still has no number on the site: ask whether she is still with the practice and, if so, for her registration. Check all three numbers on the AHPRA public register. |
| **v3.1.0: new copy** | Content team copy used as written | The New Patients page ("What to Bring", "Health Funds and Payment") and the homepage price list paragraph are GYA drafts; the Health Funds page follows the 14 October notes, with CDBS facts checked against Services Australia and the Department of Health CDBS guide (cap $1,158, partial dentures covered) | Content team and Dr Choi to review. |
| **v3.1.0: fund logos** | Logos only if usage is permitted | No fund logos | Add only with the funds' permission. |
| **v3.1.0: before and after photos** | Consent, unedited, consistent lighting, risk statement | Galleries ready and invisible; the existing Smile Gallery (87 cases) is unchanged | When the photos arrive, add them under Before & After. The Smile Gallery cases could be reused once consent for each is confirmed. |
| **v3.1.0: treatment pages** | Pending Dr Choi's review | Unchanged | Revisions to follow. |
| **v3.1.0: footer price list button** | "Clicking opens a form" | On the three pages with the form it is on the page; the footer button takes visitors to the form on Prices and Payment Options | Say if a pop-up form on every page is preferred. |
| Enquiry recipients | Reception, the practice's SmileOx intake address and rowayne@gyaclients.com | Reception (admin@precisiondentistry.com.au) and rowayne@gyaclients.com, hard-coded as before, plus `SMILEOX_INTAKE_EMAIL` when set (v3.1.0) | Set `SMILEOX_INTAKE_EMAIL` in Vercel when the practice provides it. No code change needed. |
| From-address | Must be on an SMTP2GO-verified domain | `website@precisiondentistry.com.au` | Confirm precisiondentistry.com.au is verified in SMTP2GO, or set `ENQUIRY_FROM`. |
| Google Tag Manager | The 9 October booking brief names `GTM-MPN8W8JL`; the original project brief names `GTM-NFTDF44` | No container on the site | Confirm which container is current, then enter it in Site Settings > Tracking (GYA only) and publish. |
| Health funds | The brief lists none | The copy says the practice is a preferred provider for Bupa, HCF and CBHS | Confirm with the practice. Changed in one place: Site Settings > Booking and payments. |
| Phone, address, hours, email, ABN | (07) 3852 1160; S13, HQ South Tower, 520 Wickham Street, Fortitude Valley QLD 4006; Mon, Wed, Thu 9 to 6, Tue 10 to 7, Fri 8 to 5; admin@precisiondentistry.com.au; ABN 45 166 034 199 | Same | No conflict. |
| Principal's name | The project brief flags "Choi" vs "Chun" on the scrubs | Choi throughout, matching the URL | Confirmed spelling still to be recorded. |
| Social links | Socials editable in settings | Footer icons link to `#` | Add the profile URLs in Site Settings > Social media. |
| Meet the Team | Practitioner photos and roster from the client | Pending new staff photos and introductions (9 October feedback) | Edit under Team when supplied. |
| Blog footer link | Publishing a post adds it to /blog, the sitemap, Article schema and the footer link | The blog is already linked from the main menu (desktop and mobile) and the Patients menu; the approved footer has no blog link | Posts are added to /blog, both sitemaps and the schema automatically. No footer link was added, so the footer stays as approved. Say if you want one. |
| Feature flags | Pre-opening, emergency, CDBS, Zip/Afterpay, countdown | Only Emergency dentistry has matching content (it removes the Emergency menu column when off) | The other switches are stored and labelled "not used on this website yet". |
| Standard stack | New builds render pages with Next.js App Router components from the GYA Site Kit | This retrofit keeps the approved static HTML and generates it at build time; Next.js hosts the dashboard and API only | By the retrofit rule: keep every template and URL pixel for pixel, never rebuild. |
| Page editor | This brief: collapsed sections with labels, drag to reorder, expand to edit | Built to this brief, with a Preview link on every page | Cronulla v2.2 moved to a click-on-the-page visual editor at Rowayne's request. Say if Precision should get that instead. |
| Hero media consent | Patients in hero media need consent | Unchanged from the approved build | Still on the go-live list from the project brief. |
