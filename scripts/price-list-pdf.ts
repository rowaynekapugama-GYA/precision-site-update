/**
 * Build step: write the printable price list PDF from data/price-list.json.
 *
 *   npx tsx scripts/price-list-pdf.ts        (also run by npm run build, before the render)
 *
 * Output: public/downloads/<pdfFile from the data file>. A4, laid out like the practice's
 * own March 2026 price list (cover with a photo collage, a logo and contact header on every
 * page, the blue wave along the bottom, the fee table, a Payment Systems page, a Preferred
 * Providers page and a back cover), set in the website's fonts and palette (Manrope and
 * Instrument Serif, from scripts/pdf/fonts). The photos in scripts/pdf/img are the
 * practice's own, from that price list.
 *
 * Practice details and the New Patient Offer come from Site Settings (content/site-settings.json,
 * which the build has just pulled from the dashboard), so the PDF always matches the website.
 * Older price list PDFs written by this script are removed, so only the current edition can be
 * downloaded. When data/price-list.json has "pdfDesigned": true and the file is there, the
 * build keeps that designed PDF and writes nothing.
 */
import './load-env'
import fs from 'node:fs'
import path from 'node:path'
import PDFDocument from 'pdfkit'
import { loadContent } from '../src/content/load'
import { withLeadDefaults } from '../src/render/leads'
import { PRICE_DATA, priceCategories, fillText, type PriceRow } from '../src/render/priceList'
import { streetLineFull } from '../src/render/settings'

const root = process.cwd()
const outDir = path.join(root, 'public', 'downloads')
const outFile = path.join(outDir, PRICE_DATA.pdfFile)
const fontDir = path.join(root, 'scripts', 'pdf', 'fonts')
const imgDir = path.join(root, 'scripts', 'pdf', 'img')
const logo = path.join(root, 'public', 'assets', 'img', 'logo.png')
const img = (name: string) => path.join(imgDir, name)
const has = (p: string) => fs.existsSync(p)

// a designed PDF (exported from the design canvas) is kept as it is
if (PRICE_DATA.pdfDesigned && fs.existsSync(outFile)) {
  console.log(`price list PDF: keeping the designed public/downloads/${PRICE_DATA.pdfFile}`)
  process.exit(0)
}

const s = withLeadDefaults(loadContent().settings)
const a = s.address
const cats = priceCategories(s)
const website = 'www.precisiondentistry.com.au'
// NAP: the street exactly as on the Google Business Profile, e.g. "S13/520 Wickham St"
const streetLine = streetLineFull(s)
const addressLine = `${streetLine}, ${a.suburb} ${a.state} ${a.postcode}`

// the website's palette (public/assets/css/styles.css)
const C = {
  navy: '#012A41', blue: '#0A84B8', blue5: '#1A9AD4', blue4: '#4FB2E3', sky: '#8FD0F0', sky100: '#DCEFFA', sky50: '#EEF6FB',
  ink: '#0E2433', ink2: '#44596A', ink3: '#6E8291', line: '#D5E3EC', white: '#FFFFFF',
}

// a fixed date keeps the file byte-for-byte the same between builds when nothing changed
const STAMP = new Date('2026-10-01T00:00:00Z')
const doc = new PDFDocument({
  size: 'A4', autoFirstPage: false, bufferPages: true, pdfVersion: '1.7',
  margins: { top: 118, bottom: 86, left: 40, right: 40 },
  info: {
    Title: `${s.practiceName} ${PRICE_DATA.title}, ${PRICE_DATA.edition}`,
    Author: s.practiceName,
    Subject: `Fees for common treatments at ${s.practiceName}, ${a.suburb}`,
    Keywords: 'price list, dental fees, Fortitude Valley dentist',
    CreationDate: STAMP, ModDate: STAMP,
  },
})
doc.registerFont('R', path.join(fontDir, 'manrope-latin-400-normal.woff'))
doc.registerFont('SB', path.join(fontDir, 'manrope-latin-600-normal.woff'))
doc.registerFont('B', path.join(fontDir, 'manrope-latin-700-normal.woff'))
doc.registerFont('XB', path.join(fontDir, 'manrope-latin-800-normal.woff'))
doc.registerFont('SerifI', path.join(fontDir, 'instrument-serif-latin-400-italic.woff'))

const PW = 595.28, PH = 841.89
const L = 40, W = PW - 80
const TOP = 118, BOTTOM = PH - 86

fs.mkdirSync(outDir, { recursive: true })
const tmp = outFile + '.tmp'
const stream = fs.createWriteStream(tmp)
doc.pipe(stream)

// --------------------------------------------------------------- furniture
/** The blue wave along the bottom of a page, in the site's three blues. */
function wave(y = PH - 58) {
  doc.save()
  doc.moveTo(0, y + 22).bezierCurveTo(150, y - 6, 300, y + 40, 450, y + 10).bezierCurveTo(520, y - 4, 560, y + 4, PW, y + 2).lineTo(PW, PH).lineTo(0, PH).closePath().fill(C.sky100)
  doc.moveTo(0, y + 34).bezierCurveTo(160, y + 10, 320, y + 50, 470, y + 24).bezierCurveTo(530, y + 14, 565, y + 20, PW, y + 18).lineTo(PW, PH).lineTo(0, PH).closePath().fill(C.blue5)
  doc.moveTo(0, y + 46).bezierCurveTo(170, y + 28, 330, y + 58, 480, y + 40).bezierCurveTo(540, y + 32, 570, y + 36, PW, y + 34).lineTo(PW, PH).lineTo(0, PH).closePath().fill(C.navy)
  doc.restore()
}

/** Logo on the left, the practice's contact block on the right, as on the practice's own price list. */
function header() {
  if (has(logo)) doc.image(logo, L, 34, { width: 128 })
  const right = (lines: { t: string; font?: string; color?: string; size?: number }[], y: number) => {
    for (const ln of lines) {
      doc.font(ln.font || 'B').fontSize(ln.size || 7.6).fillColor(ln.color || C.navy)
      doc.text(ln.t, L, y, { width: W, align: 'right', lineBreak: false })
      y += (ln.size || 7.6) + 3.2
    }
    return y
  }
  let y = right([{ t: streetLine }, { t: `${a.suburb} ${a.state} ${a.postcode}` }], 32)
  right([{ t: s.phone, size: 8.2 }, { t: s.email, font: 'SB', color: C.ink2 }, { t: website, font: 'SB', color: C.ink2 }], y + 8)
  doc.y = TOP
}

function newPage(withHeader = true) {
  doc.addPage()
  wave()
  if (withHeader) header()
  doc.y = TOP
}

function ensure(h: number, onBreak?: () => void) {
  if (doc.y + h > BOTTOM) { newPage(); onBreak?.() }
}

/** A page title in the price list's style: spaced capitals in blue. */
function title(text: string, y = TOP + 6) {
  doc.font('SB').fontSize(19).fillColor(C.blue5).text(text.toUpperCase(), L, y, { width: W, align: 'center', characterSpacing: 4.5, lineBreak: false })
  doc.y = y + 44
}

/** A photo cropped to fill a box (cover), optionally clipped to a polygon. */
function photo(file: string, x: number, y: number, w: number, h: number, clip?: [number, number][]) {
  const p = img(file)
  if (!has(p)) { doc.rect(x, y, w, h).fill(C.sky100); return }
  doc.save()
  if (clip) { doc.polygon(...clip); doc.clip() } else { doc.rect(x, y, w, h).clip() }
  doc.image(p, x, y, { cover: [w, h], align: 'center', valign: 'center' })
  doc.restore()
}

// ------------------------------------------------------------------- cover
function cover() {
  doc.addPage()
  doc.page.margins.bottom = 0
  // all the cuts share one slope, as on the practice's own cover
  const m = 0.37
  const yAt = (x: number, y0: number) => y0 - m * x
  // a light blue field behind the photos, and a navy ribbon beneath them
  doc.save(); doc.polygon([0, 0], [PW, 0], [PW, yAt(PW, 640)], [0, 640]).fill(C.sky100); doc.restore()
  doc.save(); doc.polygon([0, 612], [PW, yAt(PW, 612)], [PW, yAt(PW, 640)], [0, 640]).fill(C.blue5); doc.restore()
  doc.save(); doc.polygon([0, 640], [PW, yAt(PW, 640)], [PW, yAt(PW, 652)], [0, 652]).fill(C.navy); doc.restore()
  const g = 12 // the white gap between photos
  const xm = 300
  photo('reception-call.jpg', 0, 0, xm, 340, [[0, 0], [xm, 0], [xm, yAt(xm, 330)], [0, 330]])
  photo('patient-smile.jpg', xm + g, 0, PW - xm - g, 200, [[xm + g, 0], [PW, 0], [PW, yAt(PW, 330) - g], [xm + g, yAt(xm + g, 330) - g]])
  photo('treatment-closeup.jpg', 0, 330, xm, 280, [[0, 330 + g], [xm, yAt(xm, 330) + g], [xm, yAt(xm, 600)], [0, 600]])
  photo('treatment-team.jpg', xm + g, 100, PW - xm - g, 300, [[xm + g, yAt(xm + g, 330)], [PW, yAt(PW, 330)], [PW, yAt(PW, 600) - g], [xm + g, yAt(xm + g, 600) - g]])
  // white below the ribbon
  doc.save(); doc.polygon([0, 652], [PW, yAt(PW, 652)], [PW, PH], [0, PH]).fill(C.white); doc.restore()

  if (has(logo)) doc.image(logo, PW - 40 - 160, 478, { width: 160 })
  doc.font('XB').fontSize(70).fillColor(C.navy)
  doc.text('PRICE', L, 560, { width: W, align: 'right', lineBreak: false, characterSpacing: -1 })
  doc.text('LIST', L, 628, { width: W, align: 'right', lineBreak: false, characterSpacing: -1 })
  doc.font('SerifI').fontSize(26).fillColor(C.blue).text(PRICE_DATA.edition, L, 700, { width: W, align: 'right', lineBreak: false })

  doc.font('B').fontSize(10.5).fillColor(C.navy).text('BOOK APPOINTMENT:', L, 740, { lineBreak: false, characterSpacing: 0.5 })
  doc.font('XB').fontSize(20).fillColor(C.blue5).text(s.phone, L, 756, { lineBreak: false })
  doc.font('B').fontSize(9.5).fillColor(C.navy)
  doc.text(streetLine, L, 754, { width: W, align: 'right', lineBreak: false })
  doc.text(`${a.suburb} ${a.state} ${a.postcode}`, L, 768, { width: W, align: 'right', lineBreak: false })
  wave(PH - 44)
  doc.page.margins.bottom = 86
}

// ------------------------------------------------------------------ table
const COLS = [92, W - 92 - 112, 112] // ADA item number, service, price
const PAD = 9

function tableHead() {
  const y = doc.y
  doc.rect(L, y, W, 30).fill(C.blue4)
  doc.font('B').fontSize(8.6).fillColor(C.white)
  doc.text('ADA item', L, y + 6, { width: COLS[0], align: 'center', lineBreak: false })
  doc.text('number', L, y + 16.5, { width: COLS[0], align: 'center', lineBreak: false })
  doc.text('Service', L + COLS[0], y + 11, { width: COLS[1], align: 'center', lineBreak: false })
  doc.text('Price', L + COLS[0] + COLS[1], y + 11, { width: COLS[2], align: 'center', lineBreak: false })
  doc.y = y + 30
}

function rowHeight(r: PriceRow): number {
  doc.font(r.offer ? 'SB' : 'R').fontSize(8.8)
  const h1 = doc.heightOfString(r.service + (r.plan ? ' *' : ''), { width: COLS[1] - PAD * 2, lineGap: 1.6 })
  doc.font('R').fontSize(8.4)
  const h2 = doc.heightOfString(r.items, { width: COLS[0] - 12, lineGap: 1.6 })
  doc.font('B').fontSize(8.8)
  const h3 = doc.heightOfString(r.price, { width: COLS[2] - 12, lineGap: 1.6 })
  return Math.max(h1, h2, h3) + 9
}

function row(r: PriceRow, band: string) {
  const h = rowHeight(r)
  const y = doc.y
  doc.rect(L, y, W, h).fill(r.offer ? C.sky : band)
  doc.font('R').fontSize(8.4).fillColor(C.ink).text(r.items, L + 6, y + 5, { width: COLS[0] - 12, align: 'center', lineGap: 1.6 })
  doc.font(r.offer ? 'SB' : 'R').fontSize(8.8).fillColor(C.ink).text(r.service + (r.plan ? ' *' : ''), L + COLS[0] + PAD, y + 4.5, { width: COLS[1] - PAD * 2, lineGap: 1.6 })
  doc.font('B').fontSize(8.8).fillColor(C.navy).text(r.price, L + COLS[0] + COLS[1] + 6, y + 5, { width: COLS[2] - 12, align: 'center', lineGap: 1.6 })
  doc.y = y + h
}

function categoryHead(name: string, band: string) {
  const y = doc.y
  doc.rect(L, y, W, 24).fill(band)
  doc.font('B').fontSize(9.6).fillColor(C.navy).text(name, L + COLS[0] + PAD, y + 7, { width: COLS[1] - PAD * 2, lineBreak: false })
  doc.y = y + 24
}

function tableFrame(y0: number, y1: number) {
  doc.save()
  doc.lineWidth(0.8).strokeColor(C.blue4)
  doc.rect(L, y0, W, y1 - y0).stroke()
  doc.moveTo(L + COLS[0], y0).lineTo(L + COLS[0], y1).stroke()
  doc.moveTo(L + COLS[0] + COLS[1], y0).lineTo(L + COLS[0] + COLS[1], y1).stroke()
  doc.restore()
}

function feeTable() {
  newPage()
  doc.font('R').fontSize(8.8).fillColor(C.ink2)
  const note = fillText(PRICE_DATA.disclaimer, s)
  doc.font('B').fillColor(C.navy).text('Note: ', L, doc.y, { continued: true, lineGap: 2 })
  doc.font('R').fillColor(C.ink2).text(note, { width: W, lineGap: 2 })
  doc.y += 14
  let frameTop = doc.y
  tableHead()
  let band = C.white
  const closeFrame = () => tableFrame(frameTop, doc.y)
  for (const c of cats) {
    const rows = c.rows
    // keep a category heading with its first row; on a new page, draw the frame so far and repeat the column heads
    if (doc.y + 26 + rowHeight(rows[0]) + 4 > BOTTOM) { closeFrame(); newPage(); frameTop = doc.y; tableHead() }
    // the four-row consultation category sits in one band; categories alternate white and light blue
    categoryHead(c.name, band)
    for (const r of rows) {
      if (doc.y + rowHeight(r) > BOTTOM) { closeFrame(); newPage(); frameTop = doc.y; tableHead(); categoryHead(`${c.name} (continued)`, band) }
      row(r, band)
    }
    // a little air at the end of each category
    const y = doc.y; doc.rect(L, y, W, 4).fill(band); doc.y = y + 4
    band = band === C.white ? C.sky50 : C.white
  }
  closeFrame()
  doc.y += 12
  const notes: string[] = []
  if (cats.some((c) => c.rows.some((r) => r.plan))) notes.push(`* ${PRICE_DATA.planNote}`)
  if (cats.some((c) => c.rows.some((r) => r.offer))) {
    notes.push(`${s.offer.title}: ${s.offer.termsLine || 'New patients only. Terms and conditions apply.'} Full terms: ${website}${s.offer.termsUrl || '/new-patient-offer-terms/'}`)
  }
  notes.push(`Fees current as at ${PRICE_DATA.edition}.`)
  doc.font('R').fontSize(7.8).fillColor(C.ink3)
  const needed = notes.reduce((t, n) => t + doc.heightOfString(n, { width: W, lineGap: 1.5 }) + 3, 0)
  ensure(needed)
  for (const n of notes) { doc.text(n, L, doc.y, { width: W, lineGap: 1.5 }); doc.y += 3 }
}

// ------------------------------------------------------------ payment page
function paymentPage() {
  const P = PRICE_DATA.payment
  newPage()
  title('Payment systems')
  const gap = 26
  const lw = 226, rw = W - lw - gap
  const lx = L, rx = L + lw + gap
  // left: a practice photo, HICAPS, payment methods
  let y = doc.y
  photo('reception-wide.jpg', lx, y, lw, 150)
  y += 164
  doc.font('R').fontSize(8.8).fillColor(C.ink2).text(P.hicaps, lx, y, { width: lw, lineGap: 2.2 })
  y = doc.y + 14
  doc.font('B').fontSize(9.4).fillColor(C.navy).text('HICAPS', lx, y, { width: lw, lineBreak: false, characterSpacing: 2 })
  doc.font('SerifI').fontSize(9.4).fillColor(C.blue).text('Fast claims... on the spot', lx, y + 14, { width: lw, lineBreak: false })
  y += 40
  doc.font('R').fontSize(8.8).fillColor(C.ink2).text(P.methods, lx, y, { width: lw, lineGap: 2.2 })
  // right: the payment plan options
  y = TOP + 50
  doc.font('B').fontSize(12).fillColor(C.blue5).text(`${s.practiceName} Payment Plan Options`, rx, y, { width: rw })
  y = doc.y + 10
  for (const plan of P.plans) {
    doc.font('B').fontSize(10).fillColor(C.navy).text(plan.name, rx, y, { width: rw })
    y = doc.y + 4
    for (const pt of plan.points) {
      doc.circle(rx + 4, y + 5, 2).fill(C.blue5)
      doc.font('R').fontSize(8.8).fillColor(C.ink2).text(pt, rx + 14, y, { width: rw - 14, lineGap: 2 })
      y = doc.y + 4
    }
    y += 10
  }
  if (P.plansNote) { doc.font('SB').fontSize(8.8).fillColor(C.navy).text(P.plansNote, rx, y, { width: rw, lineGap: 2 }); y = doc.y + 4 }
  doc.font('R').fontSize(7.8).fillColor(C.ink3).text(P.terms, rx, y, { width: rw })
  y = doc.y + 14
  if (s.serviceAreaLine) doc.font('R').fontSize(8.8).fillColor(C.ink2).text(s.serviceAreaLine, rx, y, { width: rw, lineGap: 2 })
}

// ------------------------------------------------------------- funds page
function fundsPage() {
  const F = PRICE_DATA.funds
  newPage()
  title('Preferred providers')
  const pf = String(s.preferredFunds || '').toUpperCase()
  doc.font('SB').fontSize(11.5).fillColor(C.navy)
  doc.text('WE ACCEPT MOST HEALTH FUNDS', L, doc.y, { width: W, align: 'center', characterSpacing: 2.2 })
  doc.text('AND ARE ALSO PREFERRED PROVIDERS', L, doc.y + 4, { width: W, align: 'center', characterSpacing: 2.2 })
  const y0 = doc.y + 4
  const w1 = doc.widthOfString('FOR ', { characterSpacing: 2.2 }), w2 = doc.widthOfString(pf, { characterSpacing: 2.2 })
  const x0 = L + (W - w1 - w2) / 2
  doc.text('FOR ', x0, y0, { characterSpacing: 2.2, lineBreak: false })
  doc.fillColor(C.blue5).text(pf, x0 + w1, y0, { characterSpacing: 2.2, lineBreak: false })
  doc.y = y0 + 32
  // the funds as a grid of named tiles (no fund logos: their use needs each fund's permission)
  const cols = 3, gap = 10
  const tw = (W - gap * (cols - 1)) / cols
  const th = 30
  const rows = Math.ceil(F.list.length / cols)
  const gy = doc.y
  F.list.forEach((f, i) => {
    const cx = L + (i % cols) * (tw + gap), cy = gy + Math.floor(i / cols) * (th + gap)
    doc.roundedRect(cx, cy, tw, th, 7).fill(C.sky50)
    doc.font('SB').fontSize(8.4).fillColor(C.navy)
    const lines = doc.heightOfString(f, { width: tw - 16 }) > 14 ? 2 : 1
    doc.text(f, cx + 8, cy + (lines === 1 ? 10 : 5), { width: tw - 16, align: 'center', lineGap: 0 })
  })
  doc.y = gy + rows * (th + gap) + 8
  doc.font('B').fontSize(9.6).fillColor(C.navy).text('This means maximum benefits for you when you claim on the spot.', L, doc.y, { width: W, align: 'center' })
  doc.font('SB').fontSize(9.6).fillColor(C.blue5).text('Ask us about yours!', L, doc.y + 2, { width: W, align: 'center' })
  doc.y += 18
  const ph = Math.max(120, BOTTOM - doc.y - 6)
  photo('reception-desk.jpg', L, doc.y, W, ph)
}

// -------------------------------------------------------------- back cover
function backCover() {
  doc.addPage()
  doc.page.margins.bottom = 0
  photo('reception-room.jpg', 0, 0, PW, 400)
  if (has(logo)) doc.image(logo, (PW - 170) / 2, 440, { width: 170 })
  doc.font('B').fontSize(10.5).fillColor(C.navy)
  doc.text(streetLine, L, 540, { width: W, align: 'center' })
  doc.text(`${a.suburb} ${a.state} ${a.postcode}`, L, doc.y + 1, { width: W, align: 'center' })
  doc.font('XB').fontSize(30).fillColor(C.navy).text(s.phone, L, 612, { width: W, align: 'center', lineBreak: false })
  doc.font('B').fontSize(11).fillColor(C.navy).text(website, L, 660, { width: W, align: 'center', lineBreak: false })
  doc.font('SB').fontSize(9).fillColor(C.ink2).text(s.email, L, 678, { width: W, align: 'center', lineBreak: false })
  wave(PH - 70)
}

// -------------------------------------------------------------------- build
cover()
feeTable()
paymentPage()
fundsPage()
backCover()

// page numbers on the inner pages
const range = doc.bufferedPageRange()
for (let i = range.start + 1; i < range.start + range.count - 1; i++) {
  doc.switchToPage(i)
  const keep = doc.page.margins.bottom
  doc.page.margins.bottom = 0
  doc.font('R').fontSize(7.2).fillColor(C.white).text(`${s.practiceName}  ·  ${PRICE_DATA.title} ${PRICE_DATA.edition}  ·  page ${i} of ${range.count - 2}`, L, PH - 16, { width: W, align: 'right', lineBreak: false })
  doc.page.margins.bottom = keep
}

doc.end()
await new Promise<void>((resolve, reject) => { stream.on('finish', () => resolve()); stream.on('error', reject) })
fs.renameSync(tmp, outFile)

// only the current edition stays downloadable
for (const f of fs.readdirSync(outDir)) {
  if (/price-list.*\.pdf$/i.test(f) && f !== PRICE_DATA.pdfFile) fs.unlinkSync(path.join(outDir, f))
}
console.log(`price list PDF: public/downloads/${PRICE_DATA.pdfFile} (${range.count} pages, ${cats.reduce((n, c) => n + c.rows.length, 0)} fees)`)
