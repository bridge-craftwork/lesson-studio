/**
 * Embed a lesson's markdown source into a PDF as a real file attachment, so the
 * lesson can be reconstructed byte-exactly from the printed artifact.
 *
 * Uses the PDF `/EmbeddedFiles` name tree — the mechanism ZUGFeRD invoices use
 * to carry their XML — rather than stashing the source in the page's text
 * layer. That distinction matters here: PDF text extraction doesn't preserve
 * newlines or leading whitespace reliably, and the DSL is whitespace-sensitive
 * (holdings, fence indentation, the `---` note separator), so a text-layer copy
 * would look recoverable while silently not being.
 *
 * Shared by `print:pdf` (render then embed) and `pdf:attach` (embed into a PDF
 * produced some other way, e.g. the browser's own print dialog).
 */
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { createRequire } from 'node:module'
import { inflateSync } from 'node:zlib'
import { PDFDocument, PDFName, PDFDict, PDFArray } from 'pdf-lib'

const require = createRequire(import.meta.url)

/** The names the payloads are attached under; also how you find them again. */
export const SOURCE_ATTACHMENT = 'lesson-source.md'
export const PROVENANCE_ATTACHMENT = 'lesson-provenance.json'

/**
 * What produced this PDF. Recorded because a PDF outlives the context it was
 * made in — when one turns up later, this says which DSL spec it was valid
 * against and which lesson file it came from.
 */
export function provenance(lessonPath, { renderedAt } = {}) {
  let version = 'unknown'
  try {
    version = require('../package.json').version ?? 'unknown'
  } catch {
    // Fine — provenance is a convenience, never a reason to fail a render.
  }
  return {
    generator: 'lesson-studio',
    generatorVersion: version,
    dslSpec: 'contract-1/v1',
    sourceFile: basename(lessonPath),
    renderedAt: renderedAt ?? new Date().toISOString(),
  }
}

/**
 * Attach `lessonPath`'s markdown and a provenance sidecar to `pdfBytes`,
 * returning the new PDF bytes.
 */
export async function embedSource(pdfBytes, lessonPath, opts = {}) {
  const markdown = readFileSync(lessonPath)
  const pdf = await PDFDocument.load(pdfBytes)

  // pdf-lib appends unconditionally, so embedding twice would leave two copies
  // under the same name — the PDF grows on every re-render and readers disagree
  // about which one wins. Drop ours first so re-embedding replaces.
  dropAttachments(pdf, [SOURCE_ATTACHMENT, PROVENANCE_ATTACHMENT])

  await pdf.attach(markdown, SOURCE_ATTACHMENT, {
    mimeType: 'text/markdown',
    description: 'Lesson DSL source — reconstructs this document exactly.',
  })

  const meta = provenance(lessonPath, opts)
  await pdf.attach(Buffer.from(JSON.stringify(meta, null, 2), 'utf8'), PROVENANCE_ATTACHMENT, {
    mimeType: 'application/json',
    description: 'What produced this PDF.',
  })

  // Surface the same facts in document properties, where a viewer's "Get Info"
  // panel shows them without anyone knowing to look for attachments at all.
  pdf.setCreator(`lesson-studio ${meta.generatorVersion}`)
  pdf.setProducer(`lesson-studio ${meta.generatorVersion} (source embedded)`)
  pdf.setSubject(`Lesson source embedded as ${SOURCE_ATTACHMENT}`)

  return pdf.save()
}

/**
 * Remove named attachments from a loaded document. They are registered in two
 * places — the `/Names` `/EmbeddedFiles` name tree and the catalog's `/AF`
 * array (the PDF/A-3 associated-files tag) — and a leftover in either one is a
 * dangling reference, so both are cleaned.
 */
function dropAttachments(pdf, names) {
  const list = pdf.catalog
    .lookupMaybe(PDFName.of('Names'), PDFDict)
    ?.lookupMaybe(PDFName.of('EmbeddedFiles'), PDFDict)
    ?.lookupMaybe(PDFName.of('Names'), PDFArray)
  if (!list) return

  // Back to front: the leaf array is [name, spec, name, spec, …], so removing a
  // pair shifts everything after it.
  const orphaned = []
  for (let i = list.size() - 2; i >= 0; i -= 2) {
    if (names.includes(list.lookup(i)?.decodeText?.())) {
      orphaned.push(list.get(i + 1))
      list.remove(i + 1)
      list.remove(i)
    }
  }
  if (!orphaned.length) return

  const gone = orphaned.map(String)
  const af = pdf.catalog.lookupMaybe(PDFName.of('AF'), PDFArray)
  for (let i = (af?.size() ?? 0) - 1; i >= 0; i--) {
    if (gone.includes(String(af.get(i)))) af.remove(i)
  }

  // Unlinking isn't enough: pdf-lib never collects unreferenced objects, so the
  // old file streams would linger and the PDF would grow on every re-embed.
  // Delete the filespec and the stream it points at.
  for (const ref of orphaned) {
    const spec = pdf.context.lookup(ref, PDFDict)
    const stream = spec?.get(PDFName.of('EF'))
    const streamRef = pdf.context.lookupMaybe(stream, PDFDict)?.get(PDFName.of('F'))
    if (streamRef) pdf.context.delete(streamRef)
    pdf.context.delete(ref)
  }
}

/**
 * Every embedded file in a PDF, as `{ name: Uint8Array }`. pdf-lib has no
 * read-side attachment API, so this walks the catalog's `/Names`
 * `/EmbeddedFiles` name tree directly.
 */
export async function embeddedFiles(pdfBytes) {
  const pdf = await PDFDocument.load(pdfBytes)
  const out = {}

  const names = pdf.catalog.lookupMaybe(PDFName.of('Names'), PDFDict)
  const embedded = names?.lookupMaybe(PDFName.of('EmbeddedFiles'), PDFDict)
  const list = embedded?.lookupMaybe(PDFName.of('Names'), PDFArray)
  if (!list) return out

  // The name tree's leaf array alternates [name, filespec, name, filespec, …].
  for (let i = 0; i + 1 < list.size(); i += 2) {
    const name = list.lookup(i)?.decodeText?.()
    const spec = list.lookup(i + 1, PDFDict)
    const stream = spec?.lookupMaybe(PDFName.of('EF'), PDFDict)?.lookup(PDFName.of('F'))
    if (name && stream?.getContents) out[name] = decodeStream(stream)
  }
  return out
}

/**
 * A stream's actual bytes. pdf-lib writes attachments through `flateStream`, so
 * `getContents()` hands back compressed data — undo that when the stream says
 * it's FlateDecode, and pass anything else through untouched.
 */
function decodeStream(stream) {
  const bytes = stream.getContents()
  const filter = stream.dict?.lookup(PDFName.of('Filter'))
  const names = filter instanceof PDFArray
    ? filter.asArray().map((f) => f?.asString?.())
    : [filter?.asString?.()]
  return names.includes('/FlateDecode') ? new Uint8Array(inflateSync(Buffer.from(bytes))) : bytes
}

/**
 * The embedded lesson markdown, or null if this PDF carries none. The inverse
 * of `embedSource` — a round-trip you can't run is not one you can trust.
 */
export async function extractSource(pdfBytes) {
  const files = await embeddedFiles(pdfBytes)
  const md = files[SOURCE_ATTACHMENT]
  if (!md) return null
  const meta = files[PROVENANCE_ATTACHMENT]
  return {
    source: Buffer.from(md).toString('utf8'),
    provenance: meta ? JSON.parse(Buffer.from(meta).toString('utf8')) : null,
  }
}
