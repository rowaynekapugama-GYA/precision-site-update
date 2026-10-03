# Changelog

## 2026-10-03 - Blog added to the main navigation

- **Blog is now a top-level item in the main navigation**, between Patients and Contact, linking to the Dental Articles index at `/blog/`. Added to both the desktop bar and the mobile menu, on every page.
- The existing "Dental Articles and Videos" entry in the Patients menu and the footer link are unchanged.
- No CSS change. The desktop bar still fits on one line at every width above the 1120px burger breakpoint, with the header height unchanged at 78px and 44px of clearance either side at the narrowest width.
- Two lines added per page across 124 pages (404 has no site header), and nothing else touched. `index.html` is the source the build lifts the header from, so future rebuilds carry it too; regenerating the 70 blog pages from it reproduces the deployed files byte for byte.

Verified: 69 of 69 articles still pass the verbatim copy, schema and link checks; no console errors, no failed requests and no horizontal scrolling at 390, 768 or 1440 across all 124 pages.

## 2026-10-02 - Client photography replaces the blog placeholders

- **All 69 article placeholders replaced** with the client's supplied photographs. Each image was matched to its article on the filename against the article title; all 69 matched exactly, nothing was ambiguous, no image went unused and no article was left on a placeholder.
- **One image per article now serves the card, the article header and the social share.** The card is 1200x630 and the header is the same 1.905 shape, so the separate `-wide` header files were removed rather than upscaling a 1000px source to 1600px for a header that displays at about 1240px. The 69 `-wide.webp` files are deleted.
- **Cropped to 1200x630 with face-aware focal points.** Most sources are 3:2, so about a fifth of the height has to go. A centred crop was the default, but faces were detected first and the window moved to keep them whole with headroom above. 52 images had their focal point moved for faces; 17 were centred.
- **Compressed to WebP** at the highest quality that stays under the client's 150 KB ceiling. Average 44 KB, largest 91 KB, 2.95 MB for all 69.
- **Alt text written per article** for the header image, describing what each photograph actually shows rather than restating the headline. Card images stay decorative with `alt=""`, since the card link is `aria-hidden` and the title sits beside it in text.
- **The "Placeholder image" figcaption is gone** from all 69 article headers.
- `width`, `height` and `loading="lazy"` are unchanged on the cards. The header `img` moves from 1200x630 in place of 1600x840; the CSS `aspect-ratio` of `1600/840` is the identical ratio, so there is no layout shift and no stylesheet change.

Unchanged, as requested: layout, card design, filters, paging, typography, colours, copy, the Revision 1 mobile hero work, the mega menu thumbnails and every non-blog image.

Verified after the swap: 69 of 69 posts still pass the verbatim copy, schema, link and disclaimer checks; no console errors, no failed requests and no horizontal scrolling at 390, 768 or 1440 across all 124 pages.

## 2026-10-02 - Dental articles: 69 posts, index and QA pass

### Blog
- **69 rewritten articles published at their existing root level URLs**, each at the exact slug from its DEV document and with a trailing slash. No `/blog/` prefix and no redirects, so the current ranking history and backlinks carry across unchanged.
- **Copy published verbatim** from the supplied documents. One H1 per post, headings at the levels given, FAQ section retained, Australian English intact. Nothing rewritten, shortened or padded.
- **Three global components**, so the wording can be changed once for all 69 posts: the CTA button pair, the general information disclaimer, and the surgical risk statement.
- **CTA is two buttons, not text.** The bold "Book Online | Call (07) 3852 1160" line renders as Book Online (booking system, new tab) and Call (07) 3852 1160 (`tel:0738521160`).
- **Risk statement on the 20 posts** whose DEV document requires one: 01, 03, 06, 07, 08, 09, 16, 17, 29, 33, 34, 35, 36, 37, 38, 42, 45, 52, 53, 54. The general disclaimer is on all 69.
- **Internal links** from each post's own anchor table, on the first occurrence only, same tab, followed. Never inside a heading or the button line, and no copy was altered to make a link fit. All 39 distinct targets resolve to pages that exist.
- **Schema**: BlogPosting with headline, description, datePublished, dateModified, author, publisher and image, plus BreadcrumbList (Home > Dental Articles > post) and FAQPage. No review or rating markup anywhere on a post.
- **Publish dates and categories taken from the live site**, post by post, and cross checked against the published sitemap. No date was invented.
- **New featured images.** Nothing from the old site or the former agency is reused. Each post has a branded placeholder, named from its slug, with alt text from its new title, and a visible marker so it is not mistaken for supplied photography.

### Dental Articles index
- `/blog/` rebuilt as the Dental Articles index: 69 cards with image, category, title, excerpt, date and read time.
- Category filters and pagination at 12 per page. All 69 cards are in the HTML, so the page is complete for crawlers and with scripting off; the filter and pager only hide and show them.
- Related Articles module at the foot of every post, matched on shared internal link targets and category rather than at random.
- `sitemap.xml` rebuilt from the pages actually on disk: 124 URLs, with each article carrying its real publish date as lastmod. The HTML sitemap gains a Dental Articles column.

### QA pass on the existing build
- **Fixed:** `index.html` was the only page using relative asset paths while the other 55 used root relative ones. Normalised to root relative. This is what made the homepage render and every inner page break when the folder was opened from Finder.
- **Fixed:** `.art-card[hidden]` rule added, because `display:flex` was overriding the browser's `[hidden]` rule and the pager could not hide a card.
- **Checked clean:** no broken links or missing assets; header and footer identical on all pages; one phone number and one `tel:` href throughout; a single booking URL; one H1 per page; titles, meta descriptions and canonicals present; no em dashes; no console errors; no failed requests; no horizontal scrolling at 390, 768 or 1440.
- **Needs client input:** the five footer social links are still `href="#"`; the disclaimer, privacy policy and treatment risks pages are still marked placeholders.

## 2026-09-30 - Caching headers fixed

`vercel.json` was telling browsers to cache everything under `/assets/` for a year
with `immutable`, which means "never check again". That is only safe when file names
change on every build, and ours do not: `styles.css` keeps its name forever. So a
visitor who loaded the site once could be served an old stylesheet for a year, with
no way to get the new one short of a hard reload.

Now: CSS and JS revalidate on every request, images cache for a day and revalidate.
Slightly more requests, but the site can never go stale on someone.

Also `ul{list-style:none}` did not cover `ol`, so the breadcrumb relied on its flex
layout to suppress the numbers. It is `ul,ol` now, and `.prose ol li` still restores
decimals where the copy uses a numbered list.

## 2026-09-30 - Meet the Team restyled

Rebuilt in the shape of the reference the client sent, using the site's own tokens
rather than the template's. No new colour, radius or font.

- **Six cards, two rows of three.** Dr Choi is now the first card in the same grid
  rather than a wide feature card above it, so every card is the same shape.
- Square photograph on a soft tint, then role, name and bio beneath it.
- Role sits above the name in small uppercase blue. It is below the name in the
  markup and lifted by CSS order, so a screen reader still reads the heading first.
- Circular arrow link, pinned to the bottom of the card so cards with a link stay
  level with those without.
- **Only Dr Choi has a link**, because his is the only profile page. Five "learn
  more" links to nowhere would be worse than none. If the practice wants one on
  every card, each person needs a page or an expandable bio.
- **Everything is centred except the bio.** The reference has bios of about 25
  words; these run to 60, and centred text that long is measurably harder to read.
  Role and name centred, bio left aligned.
- Portraits recut to 1:1 from the top of the frame, trimmed slightly at the sides so
  the subject is not lost in the room.

## 2026-09-30 - Team portraits

All five staff now have a photograph on Meet the Team, alongside Dr Choi's feature
card. They were shot in reception against the same wall, so the grid reads as a set.

- Lizzy, Oral Health Therapist
- Lidia, Patient Coordinator
- Chrizza, Clinical Coordinator
- Haruna, Dental Assistant
- Sheila, Dental Assistant

Each is cut to 4:5 from the top of the frame, because these are standing three
quarter shots and a centre crop takes the head off. Alt text carries the name and
role. This closes the open item about photographs of non-dentist staff: the client
supplying them is the approval the developer instructions require.

**Who is who was confirmed with the client, not guessed.** The file names did not
survive the upload and only Sheila could be read off a photograph, from her name
badge. The obvious inference from the uniforms, that the two in plain scrubs were
the two dental assistants, turned out to be wrong on both counts.

## 2026-09-30 - Menu thumbnails rebuilt, plus 16 more service photographs

### The repeating icons are gone
The mega menu thumbnails were Phase 1 stock, and 28 distinct images were stretched
across 35 menu items, so seven groups repeated. One photo of a woman in a chair ran
under Preventive Care for Young Adults, Anxious Patients, Teeth Whitening and the
Smile Gallery at the same time. Another, a screen showing a pink scan, ran under Gum
Treatment, White Tooth Fillings, CEREC, Dental Abscess and Articles. Crowns matched
Mouthguards, Tooth Extraction matched Soft Tissue Injuries, Invisalign matched
SmileView, Grinding matched Knocked-Out Tooth, Root Canal matched Lost Crown, and
Children's Dentistry matched Children's Dental Emergencies.

Every thumbnail is now a different photograph, and all but two are the practice's own
rather than stock. Each is matched to what the page is actually about: the whitening
lamp on Teeth Whitening, the intra-oral scanner on CEREC, the OPG machine on Dental
Abscess, the clinical photography setup on Composite Resin Veneers, sedation on Tooth
Extraction, the before and after screen on Smile Gallery.

**Two are unchanged and still need a real photograph.** Children's Dentistry and
Dentures. Nothing supplied shows a child, and the denture model is the only denture
image there is. Children's Dental Emergencies now carries a different photo so it no
longer matches Children's Dentistry, but it is a general practice shot rather than a
children's emergency one.

### 16 more photographs placed
- **Contact**, "Getting Here and Parking": the building exterior with the Precision
  Dental signage above Cafe Etto, which is what someone reading that section needs.
- **About Us**, "Visit Us": the front desk.
- **Accreditation**: a treatment room.
- **Tooth Extraction**: treatment in progress.
- The rest go into the menu thumbnails above.

### Counts
37 distinct photographs across the pages, 35 across the menu. The heaviest-used page
image is down to 6 pages. 52 MB of JPEG became 1.1 MB of WebP.

## 2026-09-30 - Service photography, 16 images

The practice supplied 16 photographs from a shoot covering the treatment rooms,
equipment and treatment in progress. Every one is placed, each on a single page.

### Page heroes
- **Category pages**: General Dentistry gets the intra-oral camera examination,
  Cosmetic Dentistry a patient looking at her smile in the mirror, Restorative
  Dentistry treatment in progress. Emergency Dentistry keeps its existing photograph.
- **Treatment pages the shoot covers directly**: Invisalign gets the study models
  comparing fixed braces with clear aligners, Dental Implants the implant fixture in
  a model, Porcelain Veneers the front-teeth work, Check-Up and Clean the x-ray review
  on screen, Wisdom Teeth the x-ray being taken, Anxious Patients the consultation
  shot with no instruments in frame, Preventive Care for Adults the treatment room.
- **Invisalign SmileView** now carries the aligners on a study model.
- Two of the sixteen are not service pages but are clearly where they belong:
  **Dental Technology** gets the OPG and panoramic x-ray room, and **Infection
  Prevention and Control** the prepared treatment room with the lead-lined door.

### The three upright photographs
A tall frame in a 4:3 page hero loses its top and bottom, which on these would have
cut off either the screen or the clinician. They sit beside body copy instead, in the
portrait media-split, against the "Is this right for you?" section where a patient is
deciding: the scale and clean on Check-Up and Clean, the x-ray discussion on Gum and
Periodontal Treatment, and Dr Choi working with loupes on Root Canal Therapy.

### Repetition
Thirteen more pages now carry their own photograph instead of a rotated one. The
heaviest-used image is down to 7 pages from 8, and 16 photographs are used exactly
once each. 56 MB of JPEG became 774 KB of WebP.

### Fixed while in there
- **Trade mark symbols were printing as raw entity text.** The mega menu writes
  `Invisalign<sup>&reg;</sup>`. Stripping the tags left the literal string `&reg;`,
  which then had its ampersand escaped, so the Invisalign breadcrumb read
  "Invisalign&reg;" and four related-service cards and the sitemap read the same. The
  menu label is now unescaped after the tags come off, so it prints Invisalign(R) and
  Invisalign SmileView(TM) properly. A new `plain()` helper does this in one place.
- **Smile gallery tiles are now square.** The supplied before and after photographs
  are all 1:1, before stacked over after. The tile was 3:2, so each one sat letterboxed
  with pale bars either side, and the enlarged view did the same. Tiles are 1:1 and the
  enlarged panel now sizes itself to the photograph.

## 2026-09-30 - Smile gallery built from the current site

The gallery was a consent placeholder. It now carries all 87 before and after cases
published on precisiondentistry.com.au, with the practice's own labels and disclaimer.

### What was carried across
- 87 cases, each with the patient first name, suburb and treatment exactly as the
  practice labels them today. Nothing was renamed or reworded.
- The time between the two photographs, printed on each card. Only where the current
  page states one: Invisalign 3 to 8 months, crowns and bridges 1 day to 2 weeks,
  veneers 3 weeks, implants 4 months. Whitening, bonding and full mouth rehabilitation
  show no timeframe on the current site, so those cards carry none rather than a guess.
  Confirm those three with the practice and they can be added.
- The practice's own disclaimer, below the CTA.

### What was not carried across
The current intro says the gallery shows "the drastic transformations we have achieved".
That is an outcome claim of the kind the advertising guidelines treat as creating
unrealistic expectations, so it was left behind. The approved copy from the content team
is used instead, with a short note above the grid saying the photographs are published
with permission, are shown as taken, and that results vary between individuals.

### How it works
- Filter chips for Implant, Invisalign, Composite Veneers, Porcelain Veneers, Whitening,
  Bonding, Crowns and Bridges and Full Mouth Rehabilitation, each with a count. The count
  line under them updates as you filter and is announced to screen readers.
- Clicking a photograph opens it larger. Arrow keys move through the cases, Escape closes,
  focus is trapped in the dialog while it is open and returns to the tile afterwards. The
  arrows stay inside whichever filter is active.
- Photographs are fitted inside their tile, never cropped, because a before and after image
  has to be published as it was taken and cropping one could remove half the comparison.
  Mixed aspect ratios were tested and all sit correctly.
- Thumbnails in the grid at 700px, full size at 1400px, all lazy loaded.

### The images are NOT in this zip
They are pulled from the current website, which the build machine cannot reach. Run the
puller in the site folder once before uploading: `bash pull-gallery-images.sh` on a Mac,
or `powershell -ExecutionPolicy Bypass -File .\pull-gallery-images.ps1` on Windows. Both
write the same file names. See `assets/img/gallery/README.txt`. If that folder is still
empty at go-live the page will show 87 broken images.

## 2026-09-30 - Dr Choi portrait and photos on the Patients and Contact pages

Five further photographs supplied by the practice.

### Dr Billy Choi
- His portrait is now the standing photograph taken in reception, replacing the crop we
  had lifted out of the team photo. It is cut twice from the original: 4:5 for the panel
  beside his introduction, 1:1 for the feature card on the Meet the Team page. Both crops
  are anchored to the top of the frame so the narrower mobile shapes do not clip his face.
- His profile page hero is now the photograph of him with a patient and assistant, so the
  page carries two different pictures of him rather than the same one twice.

### Patients pages
- **Invisalign SmileView**: the treatment-room photograph showing a digital scan and clear
  aligners on screen.
- **Smile Gallery**: a patient in the chair. The gallery grid itself is still the consent
  placeholder, unchanged.
- **Dental Articles and Videos**: the waiting area.

### Contact
- Hero is now the reception desk photograph.
- "Getting Here and Parking" carries the reception wall photograph.

### Also
- `accreditation.webp` was byte for byte identical to `cosmetic.webp`, so the About Us
  "Accreditation and Safety" section was showing the same picture as the Cosmetic Dentistry
  category hero. It now carries the new photograph of a prepared treatment room, which
  suits a section about sterilisation better, and the duplicate file is deleted.
- Removed a stray line reading "GENERAL DENTISTRY" from the Contact page copy. It is a
  section marker from the copy document, not a sentence, and it rendered as a loose line
  of shouting under the enquiry form heading. Flagged to GYA rather than rewritten.
- The shared page shell now finds the header, footer, CTA and contact block in index.html
  by marker instead of by line number, so editing the homepage can no longer silently
  carve the wrong markup into the generated pages.

## 2026-09-30 - Client photography

The practice supplied 14 photographs. They are now placed across the site, and the
repeated stock-style imagery is gone.

### Hero
- The hero is now the reception photograph instead of the video. It shows the practice
  signage and the entrance, so visitors see the real place straight away.
- A slow drift (30 second Ken Burns, scale and a small pan) keeps some life in the still.
  It switches off under prefers-reduced-motion.
- The overlay was retuned for the new picture: lighter at the top so the signage and
  pendant read clearly, deeper behind the copy. Measured contrast improved to 7.5:1 on the
  headline, 9.7:1 on the subheading and 5.8:1 on the intro, all clearing WCAG AA.
- The video and its poster frame have been removed, as nothing referenced them any more.

### Placed to match the section each photo was named for
- **Homepage**: About, Why Choose Us, Patient Benefits and the four service rows.
- **About page**: hero, Our Philosophy, Our Team, Accreditation and Safety, Technology and
  Visit Us, alternating image left and right down the page.
- **Prices**: the fees consultation photograph.
- **Meet the Team** and **Dr Choi's introduction**: the two new image slots requested.
  Dr Choi's portrait sits beside his introduction rather than in the hero, so it does not
  appear twice on one page.

### Repetition
Every page in a category used to carry the same category photograph: 12 general dentistry
pages shared one image. The wider set is now rotated across the service pages, so the
heaviest-used photo appears on 8 pages instead of 12, spread over 7 images instead of 4.

### Weight
49 MB of JPEG became 1.1 MB of WebP. The hero ships at 2400px with a 1200px version for
phones. The whole site is now 4.0 MB including every page and photograph.

### Also
- New `media-split` component for a photograph beside body copy, on the existing tokens.
- Fixed an explore-link icon that rendered at full size on the team feature card.
- **Dr Billy Choi's name is confirmed.** The embroidery on his scrubs in the team photograph
  reads "Dr. Billy Choi", which settles the Phase 1 query. The earlier "Chun" reading came
  from a low resolution thumbnail. The copy document, meta titles and 301 map were right.

### Verified
- 56 pages, zero broken links, zero missing assets.
- No horizontal scrolling at 320, 390, 768, 1024, 1440 and 1920.
- Every new photograph carries meaningful alt text; the decorative band image is correctly
  marked aria-hidden.

### Note
The same photograph was supplied twice, named both "Cosmetic Dentistry" and "Accreditation
and safety". It is used in both places, which are on different pages and at different sizes.
A distinct sterilisation or accreditation photograph would be better if one exists.

## 2026-09-30 - Remaining pages built

The site was a homepage only. Every other page in the copy document is now built in
the same design system, so the menu no longer points at pages that do not exist.

### Built
- **54 new pages**: 28 service pages, 4 category pages, 7 suburb landing pages, 6 practice
  pages (About, Dental Technology, Accreditation, Infection Prevention and Control,
  Invisalign SmileView, Prices and Payment Options), Contact, Meet Our Team, Dr Billy Choi,
  Smile Gallery, Articles, an HTML sitemap and 3 legal placeholders.
- Copy is used **verbatim** from the client document. The only editorial acts were
  structural: grouping the flat copy into sections and moving the disclaimer and risk
  statement below the call to action, where the developer instructions put them.

### Page templates, per the developer instructions
- **Service pages**: intro, body sections, numbered steps for "What Happens at Your
  Appointment", fees module, FAQ accordion with the first question open and every answer
  present in the HTML on load, related services, global CTA, then the disclaimer and, on
  the 10 named pages, the surgical risk statement.
- **Emergency pages**: the Call button sits directly under the introduction, "When to Seek
  Care" is a highlighted alert box with the 000 guidance visible, and "What to Do Before
  Your Appointment" is a highlighted first aid box.
- **Category and suburb pages**: service cards linking through to each treatment.
- **Team**: Dr Choi as a feature card, then the team from the copy. No staff photographs,
  since photos of non-dentist staff need approval and none has been given.

### Design
- Inner page components added to the stylesheet on the existing tokens: page hero,
  numbered steps, alert and first aid boxes, service cards, team cards, credentials block,
  tables, gallery and sitemap columns. No new colour, radius or font was introduced.
- Where the copy opens with a heading rather than a paragraph, that heading becomes the
  serif italic subheading in the page hero, the same shape as the approved homepage hero.
- The sticky Call and Book bar now also holds back behind inner page heroes, so the
  booking button is never offered twice on one screen.

### Verified
- 56 pages, 61 internal URLs, **zero broken links, zero missing assets, zero orphan pages**.
- **No horizontal scrolling** at 320, 390, 768, 1024, 1440 and 1920 across all 14 page types.
- Every page: one H1, a title, a meta description, a canonical, Australian spelling, no em dashes.
- **Schema**: Dentist on all 55 indexable pages, BreadcrumbList on all 54 inner pages,
  FAQPage on the 37 pages with an FAQ. All parse. **No rating or review markup anywhere.**
- **AHPRA scan**: no superlative or expert claims, no guarantees, no pain-free claims, no
  testimonials, star ratings or review counts, no urgency wording.
- Risk statement present on exactly the 10 pages the instructions name. Disclaimer on all
  32 service pages.
- sitemap.xml regenerated with all 55 URLs.

### Open, needs the practice
- **Privacy Policy, Disclaimer and Treatment Risks** are placeholders. These are legal and
  compliance pages and their wording has to come from the practice or the old site. The
  enquiry form links to the privacy policy, so it is needed before go-live.
- **Dr Choi's Dental Board registration number** is a placeholder on his profile. It must
  come from the public register.
- **Smile Gallery** ships with no images. Each needs documented written patient consent for
  advertising use, plus a caption naming the treatment and stating that results vary.
- **Articles** has no posts. Existing ones need reviewing for superlatives, testimonials and
  outcome claims first.
- **Team photographs** are not shown pending approval.
- Page hero imagery reuses the four category photographs. Per-treatment images can be
  dropped in as the client supplies them.

## 2026-09-29 - Client revision round 1: brighter homepage, lighter type

In response to the client's feedback: brighter and clearer landing page, a lighter font, no dark blue sections, and less on the first mobile screen.

- **Hero overlay lightened.** It was up to 95% navy at the bottom, dimming the whole video. The bottom is now 58% and the wash across the middle and right is about half what it was. The copy still sits straight on the video, as before. A soft text shadow on the headline, subheading and intro carries the contrast the removed overlay used to, so the text holds on the bright frames as well as the dark ones. Measured on the poster frame: headline 5.1:1, subheading 7.8:1, intro 4.6:1, all clearing WCAG AA at the worst pixel.
- **Header now white glass** with navy text and `logo.png` in place of `logo-white.png`. The mega menu is unchanged.
- **No navy section fills.** Navy is a text and accent colour only now. Converted: the services band to `--sky-50` with white rows, the Why Choose Us card to white with a blue left edge, the featured offer card to `--sky-50` with a blue border, the footer to `--sky-50`, and the offers photo band overlay from 82% to 46% so it reads as a photo rather than a blue block. `.btn-dark` is redefined as the blue gradient, so no markup changed.
- **Lighter type.** Heading weight 700 to 600 and tracking -0.025em to -0.015em, both now tokens (`--w-head`, `--track-head`). `h1` from `clamp(2.8rem, 6.4vw, 5rem)` to `clamp(2.45rem, 5.4vw, 4.1rem)`.
- **Manrope** replaces Onest and Inter, carrying both headings and body. Instrument Serif italic stays on the hero subheading. Two font families load instead of three.
- **Mobile first view, 320 to 560.** Now the headline, the subheading and one Book button. Previously it stacked the header Book button, headline, subheading, a four line intro, two hero buttons, three chips and the sticky bar, with "Book Online" appearing three times. The intro and chips are hidden below 561px and unchanged above it. Hero height 92svh to 74svh so the About section peeks in. The header Book button drops at 420px and under. The sticky Call and Book bar now stays hidden while the hero is on screen and slides in once it scrolls away, so Book is never offered twice at once.
- **The 404 page is deliberately unchanged**, apart from its font link. It is a full page dark treatment rather than a section on the landing page, so it keeps the white logo.

Files changed: `index.html`, `404.html`, `assets/css/styles.css`, `assets/js/main.js`.

Verified: page height 7909px before, 7776px after. No horizontal scrolling at 320, 390, 768, 1024, 1440 or 1920.

## 2026-09-23 - Homepage prototype v2
- Homepage built from the client copy document, implemented verbatim.
- Full-bleed hero with the practice video (H.264, muted, looping, poster frame, pauses off screen, holds on the poster under reduced motion).
- Full-width dark sticky header with a four column Services mega menu, photo thumbnails on every row.
- Sections: hero, About, service rows, Why Choose Us, Special Offers, CTA, FAQ accordion, enquiry form and map, footer.
- Dentist and FAQPage JSON-LD. No rating or review markup.
- Enquiry form wired to a Vercel serverless function relaying through SMTP2GO.
- Responsive pass across 320px to 1920px.
