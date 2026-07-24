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
import {
  embedAttachments,
  buildProvenance,
  SOURCE_ATTACHMENT,
  PROVENANCE_ATTACHMENT,
} from '../src/lesson/pdfEmbed'

const require = createRequire(import.meta.url)

// The attach core lives in the shared, browser-safe module; these are the
// Node-only conveniences layered on top (file reading, package version, and
// zlib-based extraction for the read-back path).
export { SOURCE_ATTACHMENT, PROVENANCE_ATTACHMENT }

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
  return buildProvenance({
    generatorVersion: version,
    sourceFile: basename(lessonPath),
    renderedAt: renderedAt ?? new Date().toISOString(),
  })
}

/**
 * Attach `lessonPath`'s markdown and a provenance sidecar to `pdfBytes`,
 * returning the new PDF bytes.
 */
export async function embedSource(pdfBytes, lessonPath, opts = {}) {
  return embedAttachments(pdfBytes, {
    sourceBytes: readFileSync(lessonPath),
    provenance: provenance(lessonPath, opts),
    extras: opts.extras ?? {},
  })
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
