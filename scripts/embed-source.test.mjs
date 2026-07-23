import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PDFDocument, PDFName, PDFDict, PDFArray } from 'pdf-lib'
import { embedSource, extractSource, embeddedFiles, SOURCE_ATTACHMENT } from './embed-source.mjs'

// A lesson body chosen to be hostile to a text-layer round-trip: two-space
// indentation, a blank line inside a fence, trailing spaces, and the `---`
// note separator that a naive extractor would confuse with front matter.
const LESSON = `---
title: Round Trip
columns: 2
---

Prose with  doubled spaces and a trailing space.

\`\`\`auction
dealer: N
columns: 2
labels: Opener, Responder
1C   P    1S   P
1NT  P    2D! =1= P
---
1. New Minor Forcing — invitational.
\`\`\`

  Indented line that is not a code block.
`

let dir
let lessonPath

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'embed-source-'))
  lessonPath = join(dir, 'lesson.md')
  writeFileSync(lessonPath, LESSON)
})

afterAll(() => rmSync(dir, { recursive: true, force: true }))

/** A minimal one-page PDF, standing in for a rendered lesson. */
async function blankPdf() {
  const pdf = await PDFDocument.create()
  pdf.addPage([612, 792]).drawText('New Minor Forcing')
  return pdf.save()
}

describe('embedding lesson source in a PDF', () => {
  it('round-trips the markdown byte-exactly', async () => {
    const withSource = await embedSource(await blankPdf(), lessonPath)
    const found = await extractSource(withSource)
    expect(found).not.toBeNull()
    // Byte-exact, not merely similar — whitespace is load-bearing in the DSL.
    expect(found.source).toBe(LESSON)
  })

  it('records provenance alongside the source', async () => {
    const withSource = await embedSource(await blankPdf(), lessonPath, {
      renderedAt: '2026-07-23T00:00:00.000Z',
    })
    const { provenance } = await extractSource(withSource)
    expect(provenance).toMatchObject({
      generator: 'lesson-studio',
      dslSpec: 'contract-1/v1',
      sourceFile: 'lesson.md',
      renderedAt: '2026-07-23T00:00:00.000Z',
    })
  })

  it('attaches under stable names, so extraction can find them', async () => {
    const files = await embeddedFiles(await embedSource(await blankPdf(), lessonPath))
    expect(Object.keys(files).sort()).toEqual(['lesson-provenance.json', 'lesson-source.md'])
    expect(SOURCE_ATTACHMENT).toBe('lesson-source.md')
  })

  it('returns null for a PDF carrying no source, rather than throwing', async () => {
    expect(await extractSource(await blankPdf())).toBeNull()
  })

  it('replaces on re-embed rather than accumulating copies', async () => {
    // pdf-lib appends unconditionally, so this asserts the name-tree entries
    // themselves, not just that extraction still works — extraction keys by
    // name and would happily mask a pile of duplicates.
    let bytes = await blankPdf()
    for (let i = 0; i < 3; i++) bytes = await embedSource(bytes, lessonPath)

    const pdf = await PDFDocument.load(bytes)
    const list = pdf.catalog
      .lookupMaybe(PDFName.of('Names'), PDFDict)
      ?.lookupMaybe(PDFName.of('EmbeddedFiles'), PDFDict)
      ?.lookupMaybe(PDFName.of('Names'), PDFArray)
    expect(list.size()).toBe(4) // two attachments, as [name, spec] pairs

    // The catalog's associated-files array must not keep dangling refs either.
    expect(pdf.catalog.lookupMaybe(PDFName.of('AF'), PDFArray).size()).toBe(2)

    // Unlinking alone would still leak: pdf-lib never collects unreferenced
    // objects, so the superseded streams have to be deleted outright or the
    // file grows on every re-embed while the entry counts above stay correct.
    const once = await embedSource(await blankPdf(), lessonPath)
    expect(bytes.length).toBeLessThan(once.length + 200)

    expect((await extractSource(bytes)).source).toBe(LESSON)
  })
})
