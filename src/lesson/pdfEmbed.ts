/**
 * Embed lesson attachments into a PDF, and read block positions back out.
 *
 * The single implementation of the tricky pdf-lib work behind Contract 5 —
 * shared by the `print:pdf` / `pdf:attach` CLI and by the in-browser
 * "drop-to-attach" export, so the two can never disagree about the name-tree
 * bookkeeping (which has already bitten this codebase once: pdf-lib appends
 * unconditionally and never collects unreferenced objects, so a re-embed that
 * only unlinks leaves the file growing on every render).
 *
 * Pure pdf-lib and standard JS — no Node built-ins — so it runs in both. The
 * CLI wrappers add file I/O and zlib extraction on top; the browser export adds
 * DOM scanning and download on top. Byte handling uses Uint8Array throughout.
 */
import { PDFDocument, PDFName, PDFDict, PDFArray, AFRelationship } from 'pdf-lib'

export const SOURCE_ATTACHMENT = 'lesson-source.md'
export const PROVENANCE_ATTACHMENT = 'lesson-provenance.json'
export const BLOCK_MAP_ATTACHMENT = 'lesson-blocks.json'
export const PBN_ATTACHMENT = 'lesson-hands.pbn'
export const BLOCK_URI_SCHEME = 'lesson-block'
export const DSL_SPEC = 'contract-1/v1'

export interface Provenance {
  generator: 'lesson-studio'
  generatorVersion: string
  dslSpec: string
  sourceFile: string
  renderedAt: string
}

/** What produced this PDF (Contract 5). See the CLI/browser callers for how
 *  `generatorVersion` and `renderedAt` are sourced in each environment. */
export function buildProvenance(opts: {
  generatorVersion: string
  sourceFile: string
  renderedAt: string
}): Provenance {
  return {
    generator: 'lesson-studio',
    generatorVersion: opts.generatorVersion,
    dslSpec: DSL_SPEC,
    sourceFile: opts.sourceFile,
    renderedAt: opts.renderedAt,
  }
}

/** One extra attachment beyond the source and provenance (the click map, PBN). */
export interface Attachment {
  bytes: Uint8Array
  mimeType: string
  description: string
  afRelationship?: (typeof AFRelationship)[keyof typeof AFRelationship]
}

const enc = new TextEncoder()

/**
 * Attach the lesson source, a provenance sidecar, and any extras to `pdfBytes`.
 * Replaces our own attachments rather than appending (so size is idempotent),
 * and leaves attachments we didn't write — a PBN the author already embedded —
 * untouched. Returns the new PDF bytes.
 */
export async function embedAttachments(
  pdfBytes: Uint8Array,
  opts: {
    sourceBytes: Uint8Array
    provenance: Provenance
    extras?: Record<string, Attachment>
  }
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes)
  const extras = opts.extras ?? {}

  dropAttachments(pdf, [SOURCE_ATTACHMENT, PROVENANCE_ATTACHMENT, ...Object.keys(extras)])

  // AFRelationship marks *what the file is to this document*, so a reader finds
  // the source by relationship rather than by guessing our filename.
  await pdf.attach(opts.sourceBytes, SOURCE_ATTACHMENT, {
    mimeType: 'text/markdown',
    description: 'Lesson DSL source — reconstructs this document exactly.',
    afRelationship: AFRelationship.Source,
  })
  await pdf.attach(
    enc.encode(JSON.stringify(opts.provenance, null, 2)),
    PROVENANCE_ATTACHMENT,
    {
      mimeType: 'application/json',
      description: 'What produced this PDF.',
      afRelationship: AFRelationship.Supplement,
    }
  )
  for (const [name, spec] of Object.entries(extras)) {
    await pdf.attach(spec.bytes, name, {
      mimeType: spec.mimeType,
      description: spec.description,
      afRelationship: spec.afRelationship ?? AFRelationship.Supplement,
    })
  }

  const v = opts.provenance.generatorVersion
  pdf.setCreator(`lesson-studio ${v}`)
  pdf.setProducer(`lesson-studio ${v} (source embedded)`)
  pdf.setSubject(`Lesson source embedded as ${SOURCE_ATTACHMENT}`)

  return pdf.save()
}

/**
 * Remove named attachments from a loaded document. Registered in two places —
 * the `/Names` `/EmbeddedFiles` name tree and the catalog's `/AF` array — and
 * a leftover in either is a dangling reference, so both are cleaned; then the
 * superseded streams are deleted outright, since pdf-lib never collects them.
 */
function dropAttachments(pdf: PDFDocument, names: string[]): void {
  const list = pdf.catalog
    .lookupMaybe(PDFName.of('Names'), PDFDict)
    ?.lookupMaybe(PDFName.of('EmbeddedFiles'), PDFDict)
    ?.lookupMaybe(PDFName.of('Names'), PDFArray)
  if (!list) return

  const orphaned: unknown[] = []
  for (let i = list.size() - 2; i >= 0; i -= 2) {
    if (names.includes((list.lookup(i) as { decodeText?: () => string })?.decodeText?.() ?? '')) {
      orphaned.push(list.get(i + 1))
      list.remove(i + 1)
      list.remove(i)
    }
  }
  if (!orphaned.length) return

  const gone = orphaned.map(String)
  const af = pdf.catalog.lookupMaybe(PDFName.of('AF'), PDFArray)
  for (let i = (af?.size() ?? 0) - 1; i >= 0; i--) {
    if (gone.includes(String(af!.get(i)))) af!.remove(i)
  }

  for (const ref of orphaned as never[]) {
    const spec = pdf.context.lookup(ref, PDFDict)
    const ef = spec?.get(PDFName.of('EF'))
    const streamRef = pdf.context.lookupMaybe(ef, PDFDict)?.get(PDFName.of('F'))
    if (streamRef) pdf.context.delete(streamRef as never)
    pdf.context.delete(ref)
  }
}

export interface BlockRef {
  index: number
  kind: string
  body: string
  [k: string]: unknown
}

/**
 * Merge block positions read from the PDF's `lesson-block:<n>` link annotations
 * with the block list (which carries the DSL bodies). Chrome emits these
 * annotations from the anchors wrapped around each block before printing —
 * whether by Playwright (`print:pdf`) or by the browser's own print dialog
 * (drop-to-attach). Coordinates are PDF points, origin bottom-left.
 */
export async function readBlockPositions(
  pdfBytes: Uint8Array,
  blocks: BlockRef[]
): Promise<Record<string, unknown>> {
  const pdf = await PDFDocument.load(pdfBytes)
  const byIndex = new Map<number, { page: number; rect: number[] }[]>()

  pdf.getPages().forEach((page, pageIdx) => {
    const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray)
    for (let i = 0; i < (annots?.size() ?? 0); i++) {
      const annot = annots!.lookup(i, PDFDict)
      const uri = (
        annot
          .lookupMaybe(PDFName.of('A'), PDFDict)
          ?.lookup(PDFName.of('URI')) as { decodeText?: () => string } | undefined
      )?.decodeText?.()
      if (!uri?.startsWith(`${BLOCK_URI_SCHEME}:`)) continue

      const index = Number(uri.slice(BLOCK_URI_SCHEME.length + 1))
      const rect = annot
        .lookup(PDFName.of('Rect'), PDFArray)
        .asArray()
        .map((n) => Math.round((n as unknown as { asNumber: () => number }).asNumber() * 100) / 100)
      if (!byIndex.has(index)) byIndex.set(index, [])
      byIndex.get(index)!.push({ page: pageIdx + 1, rect })
    }
  })

  const located = blocks.map((b) => ({ ...b, ...placement(byIndex.get(b.index)) }))
  return {
    version: 1,
    pageSize: pdf.getPages().map((p) => [
      Math.round(p.getWidth() * 100) / 100,
      Math.round(p.getHeight() * 100) / 100,
    ]),
    pageCount: pdf.getPageCount(),
    coordinateSpace: 'pdf-points, origin bottom-left',
    blocks: located,
    unlocated: located.filter((b) => (b as { page?: number }).page == null).map((b) => b.index),
    fragmented: located.filter((b) => (b as { fragments?: unknown }).fragments).map((b) => b.index),
  }
}

/** Largest fragment as `rect`, all pieces in `fragments`; never unioned. */
function placement(
  annots: { page: number; rect: number[] }[] | undefined
): Record<string, unknown> {
  if (!annots?.length) return {}
  const ordered = [...annots].sort(
    (a, b) => a.page - b.page || a.rect[0] - b.rect[0] || b.rect[3] - a.rect[3]
  )
  if (ordered.length === 1) return ordered[0]
  const area = (r: number[]) => (r[2] - r[0]) * (r[3] - r[1])
  const biggest = ordered.reduce((best, f) => (area(f.rect) > area(best.rect) ? f : best))
  return { ...biggest, fragments: ordered }
}
