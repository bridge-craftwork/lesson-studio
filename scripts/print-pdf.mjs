/**
 * Render a lesson to PDF via the print view (Contract: print view -> Playwright
 * PDF -> pdf-handouts). Loads print.html?lesson=<base64> from a running
 * preview/dev server and prints the page to a PDF.
 *
 * Usage:
 *   1. Build and serve:   npm run build && npm run preview   (serves :4173)
 *      (or `npm run dev` on :5173 and pass --url http://localhost:5173)
 *   2. One-time browser:  npx playwright install chromium
 *   3. Render:            node scripts/print-pdf.mjs --lesson path/to/lesson.md --out lesson.pdf
 *
 * The emitted PDF has no page chrome — headers/footers/page numbers/dates are
 * added downstream by the pdf-handouts pipeline.
 *
 * The lesson's markdown is embedded as a PDF file attachment, so the source can
 * be recovered from the PDF alone (`npm run pdf:extract`). Pass --no-embed to
 * skip it. Note that a downstream tool which rewrites the PDF may drop
 * attachments — verify with pdf:extract if the handouts pipeline is involved.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright'
import { embedSource } from './embed-source.mjs'

const { values } = parseArgs({
  options: {
    lesson: { type: 'string' },
    out: { type: 'string', default: 'lesson.pdf' },
    url: { type: 'string', default: 'http://localhost:4173' },
    'no-embed': { type: 'boolean', default: false },
  },
})

if (!values.lesson) {
  console.error('error: --lesson <file.md> is required')
  process.exit(1)
}

const markdown = readFileSync(values.lesson, 'utf8')
const encoded = Buffer.from(markdown, 'utf8').toString('base64')
const target = `${values.url.replace(/\/$/, '')}/print.html?lesson=${encodeURIComponent(encoded)}`

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(target, { waitUntil: 'networkidle' })
await page.waitForSelector('.lesson-document')

const errors = await page.$$eval('.block-error', (els) => els.map((e) => e.textContent))
if (errors.length) {
  console.error(`error: ${errors.length} block(s) failed to render:\n${errors.join('\n')}`)
  await browser.close()
  process.exit(1)
}

const rendered = await page.pdf({ format: 'Letter', printBackground: true })
await browser.close()

// Embed the source so the lesson can be reconstructed from the PDF alone.
const bytes = values['no-embed'] ? rendered : await embedSource(rendered, values.lesson)
writeFileSync(values.out, bytes)
console.log(
  values['no-embed']
    ? `wrote ${values.out}`
    : `wrote ${values.out} (lesson source embedded)`
)
