/**
 * Recover a lesson's markdown from a PDF that carries it — the inverse of
 * pdf-attach, and the thing that makes the round-trip checkable rather than
 * merely claimed.
 *
 * Usage:
 *   node scripts/pdf-extract.mjs --pdf lesson.pdf              # to stdout
 *   node scripts/pdf-extract.mjs --pdf lesson.pdf --out l.md   # to a file
 *   node scripts/pdf-extract.mjs --pdf lesson.pdf --info       # provenance only
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { extractSource } from './embed-source.mjs'

const { values } = parseArgs({
  options: {
    pdf: { type: 'string' },
    out: { type: 'string' },
    info: { type: 'boolean', default: false },
  },
})

if (!values.pdf) {
  console.error('error: --pdf <file.pdf> is required')
  process.exit(1)
}

const found = await extractSource(readFileSync(values.pdf))
if (!found) {
  console.error(`error: ${values.pdf} carries no embedded lesson source`)
  process.exit(1)
}

if (values.info) {
  console.log(JSON.stringify(found.provenance, null, 2))
} else if (values.out) {
  writeFileSync(values.out, found.source)
  console.log(`wrote ${values.out} (${found.source.length} bytes)`)
} else {
  process.stdout.write(found.source)
}
