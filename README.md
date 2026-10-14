# Precision Dental website

precisiondentistry.com.au, built by GYA (Generate Your Audience). Fortitude Valley, Brisbane.

- **The dashboard** (`/admin`), how it is built, how to deploy it and the go-live checklist: **`README-CMS.md`**
- **For the practice:** `docs/HOW-TO-UPDATE.md`
- **What changed:** `CHANGELOG.md`

The public site is static HTML generated at build time from `content/` (see README-CMS.md). Headers,
clean URLs and the staging noindex rule are in `next.config.mjs` and `src/middleware.ts`; the enquiry
form relay is `src/app/api/enquiry/route.ts`.

## Compliance notes

The copy is the practice's approved copy. Do not rewrite it.

- No testimonials, review counts, star ratings or award badges anywhere, and no rating markup in schema.
- No claim words in copy, navigation or UI microcopy (`npm run qa:banned` checks).
- Invisalign carries the (R) and SmileView the (TM) on first mention; the menu satisfies this on every page.
- Australian English throughout. No em dashes.
- The general disclaimer on service pages and articles, and the surgical risk statement where required.
- `/treatment-risks/` stays linked in the footer.
