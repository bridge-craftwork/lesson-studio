/**
 * Embed a lesson's markdown into a PDF that already exists — the companion to
 * the browser's own print dialog, which can't attach files itself.
 *
 * Usage:
 *   node scripts/pdf-attach.mjs --pdf lesson.pdf --lesson path/to/lesson.md
 *   node scripts/pdf-attach.mjs --pdf in.pdf --lesson l.md --out out.pdf
 *
 * Rewrites --pdf in place unless --out is given.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { embedSource, extractSource } from './embed-source.mjs'

const { values } = parseArgs({
  options: {
    pdf: { type: 'string' },
    lesson: { type: 'string' },
    out: { type: 'string' },
  },
})

if (!values.pdf || !values.lesson) {
  console.error('error: --pdf <file.pdf> and --lesson <file.md> are both required')
  process.exit(1)
}

const out = values.out ?? values.pdf
const withSource = await embedSource(readFileSync(values.pdf), values.lesson)
writeFileSync(out, withSource)

// Read it straight back: an attachment that can't be recovered is worse than
// none, because it looks like the source is safe when it isn't.
const check = await extractSource(readFileSync(out))
if (!check || check.source !== readFileSync(values.lesson, 'utf8')) {
  console.error(`error: wrote ${out} but the embedded source did not read back intact`)
  process.exit(1)
}

console.log(`wrote ${out} (lesson source embedded, verified)`)
