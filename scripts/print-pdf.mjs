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
import { AFRelationship } from 'pdf-lib'
import { embedSource } from './embed-source.mjs'
import { markBlocks } from './block-map.mjs'
import { readBlockPositions, BLOCK_MAP_ATTACHMENT, PBN_ATTACHMENT } from '../src/lesson/pdfEmbed'
import { lessonPbn } from '../src/dsl/lesson-pbn'
import { resolveDealLinks } from '../src/dsl/deal-link'

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

// Wrap each block in a link before printing: the print engine then reports
// where it actually laid each one out (see block-map.mjs).
const blocks = values['no-embed'] ? [] : await markBlocks(page)

const rendered = await page.pdf({ format: 'Letter', printBackground: true })
await browser.close()

if (values['no-embed']) {
  writeFileSync(values.out, rendered)
  console.log(`wrote ${values.out}`)
} else {
  // Which auction is bid on which hand. Recorded on the map so a consumer can
  // go straight from a tapped auction to its deal, without re-deriving the rule.
  const { links, errors: linkErrors } = resolveDealLinks(blocks)
  for (const link of links) {
    const block = blocks.find((b) => b.index === link.auction)
    if (block) block.deal = link.deal
  }
  for (const err of linkErrors) console.warn(`warning: ${err}`)

  // PBN next: it assigns board numbers, which the click map carries so a
  // consumer can join a tapped block to its deal.
  const pbn = lessonPbn(blocks, { event: values.lesson.split('/').pop() })
  for (const { index, board } of pbn?.boards ?? []) {
    const block = blocks.find((b) => b.index === index)
    if (block) block.board = board
  }

  const map = await readBlockPositions(rendered, blocks)
  const extras = {
    [BLOCK_MAP_ATTACHMENT]: {
      bytes: Buffer.from(JSON.stringify(map, null, 2), 'utf8'),
      mimeType: 'application/json',
      description: 'Page and position of each bridge block, with its DSL source.',
      afRelationship: AFRelationship.Data,
    },
  }

  if (pbn) {
    extras[PBN_ATTACHMENT] = {
      bytes: Buffer.from(pbn.text, 'utf8'),
      mimeType: 'application/x-pbn',
      description: 'Lesson hands as PBN deals.',
      afRelationship: AFRelationship.Data,
    }
  }

  writeFileSync(values.out, await embedSource(rendered, values.lesson, { extras }))

  const note = [`source`, `${blocks.length} block(s) mapped`, pbn ? `${pbn.boards.length} PBN deal(s)` : null]
    .filter(Boolean)
    .join(', ')
  console.log(`wrote ${values.out} (embedded: ${note})`)
  if (map.unlocated.length) {
    console.warn(`warning: ${map.unlocated.length} block(s) had no position in the PDF`)
  }
  if (map.fragmented.length) {
    console.warn(
      `note: ${map.fragmented.length} block(s) split across a column or page; ` +
        `\`rect\` is the largest piece, \`fragments\` has them all`
    )
  }
}
