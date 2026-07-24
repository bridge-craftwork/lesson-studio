/**
 * In-browser "drop-to-attach": take a PDF the browser printed and embed the
 * four Contract 5 attachments into it, entirely client-side (no server).
 *
 * The browser's own print dialog produces a Chrome-quality PDF but cannot
 * attach files — nothing in HTML/CSS/JS can. So the flow is two steps: the user
 * prints to PDF, then hands that PDF back here, and pdf-lib adds the source,
 * provenance, click map and PBN. All the pdf-lib work is the shared core in
 * `pdfEmbed.ts`, identical to what `print:pdf` runs.
 *
 * The click map's positions come from `lesson-block:<n>` link annotations,
 * which Chrome emits only if the blocks were wrapped in anchors before
 * printing — see `wrapBlocksForPrint`, installed by the print view.
 */
import pkg from '../../package.json'
import {
  scanReservedBlocks,
  parseRowBlock,
  lessonPbn,
  splitFrontMatter,
} from '@/dsl'
import {
  buildProvenance,
  embedAttachments,
  readBlockPositions,
  BLOCK_MAP_ATTACHMENT,
  PBN_ATTACHMENT,
  BLOCK_URI_SCHEME,
  type BlockRef,
} from './pdfEmbed'

/**
 * The leaf bridge blocks of a lesson, in document order — the same list, and
 * the same indices, that `markBlocks` produces in the print DOM: a `row`
 * contributes its children, not itself. Rebuilt from the markdown so the
 * browser can pair annotation positions (which carry only indices) with the DSL
 * bodies.
 */
export function flattenLessonBlocks(markdown: string): BlockRef[] {
  const out: BlockRef[] = []
  for (const occ of scanReservedBlocks(markdown)) {
    if (occ.tag === 'row') {
      for (const item of parseRowBlock(occ.body)) {
        if (item.kind === 'block') out.push({ index: out.length, kind: item.tag, body: item.body })
      }
    } else {
      out.push({ index: out.length, kind: occ.tag, body: occ.body })
    }
  }
  return out
}

const enc = new TextEncoder()

/**
 * Attach the four files to a printed PDF and return the new bytes. `pdfBytes` is
 * the browser-printed PDF; `markdown` is the lesson it was printed from.
 */
export async function attachToPrintedPdf(
  pdfBytes: Uint8Array,
  markdown: string,
  opts: { sourceFile?: string; renderedAt?: string } = {}
): Promise<Uint8Array> {
  const blocks = flattenLessonBlocks(markdown)

  // Pair auctions to hands, and number PBN boards, exactly as the CLI does.
  const pbn = lessonPbn(blocks, { event: opts.sourceFile })
  const boardByIndex = new Map((pbn?.boards ?? []).map((b) => [b.index, b.board]))
  const dealByAuction = new Map(
    (pbn?.links ?? []).filter((l) => l.deal != null).map((l) => [l.auction, l.deal])
  )
  for (const b of blocks) {
    const board = boardByIndex.get(b.index)
    if (board != null) b.board = board
    if (b.kind === 'auction' && dealByAuction.has(b.index)) b.deal = dealByAuction.get(b.index)
  }

  const map = await readBlockPositions(pdfBytes, blocks)

  const extras: Record<string, { bytes: Uint8Array; mimeType: string; description: string }> = {
    [BLOCK_MAP_ATTACHMENT]: {
      bytes: enc.encode(JSON.stringify(map, null, 2)),
      mimeType: 'application/json',
      description: 'Page and position of each bridge block, with its DSL source.',
    },
  }
  if (pbn) {
    extras[PBN_ATTACHMENT] = {
      bytes: enc.encode(pbn.text),
      mimeType: 'application/x-pbn',
      description: 'Lesson hands as PBN deals.',
    }
  }

  return embedAttachments(pdfBytes, {
    sourceBytes: enc.encode(markdown),
    provenance: buildProvenance({
      generatorVersion: pkg.version ?? 'unknown',
      sourceFile: opts.sourceFile ?? 'lesson.md',
      // Browsers block Date in some sandboxes but this runs on a real click.
      renderedAt: opts.renderedAt ?? new Date().toISOString(),
    }),
    extras,
  })
}

/**
 * How complete the click map is, for messaging. A browser-printed PDF only
 * carries block positions if the print view wrapped the anchors; if the user
 * printed some other way, the bodies still attach but positions are missing.
 */
export function mapCoverage(map: Record<string, unknown>): {
  total: number
  located: number
} {
  const blocks = (map.blocks as { page?: number }[]) ?? []
  return { total: blocks.length, located: blocks.filter((b) => b.page != null).length }
}

/**
 * Wrap each leaf block in a `lesson-block:<n>` anchor so Chrome emits a link
 * annotation per block when the page is printed, then undo it. The DOM surgery
 * matches `markBlocks` (the Playwright path) exactly, so both print routes yield
 * the same annotations.
 *
 * Returns an `unwrap` that restores the original nodes — call it after printing.
 * Kept out of the live editing tree: the print view installs this on
 * `beforeprint` and tears it down on `afterprint`, so ProseMirror never sees a
 * lasting mutation.
 */
export function wrapBlocksForPrint(root: ParentNode = document): () => void {
  const leaves = [...root.querySelectorAll<HTMLElement>('[data-block-tag]')].filter(
    (el) => !el.querySelector('[data-block-tag]')
  )
  const restore: { anchor: HTMLElement; original: HTMLElement }[] = []

  leaves.forEach((el, i) => {
    const a = document.createElement('a')
    a.href = `${BLOCK_URI_SCHEME}:${i}`
    a.className = el.className
    a.setAttribute('style', 'color:inherit;text-decoration:none;display:block')
    for (const attr of el.getAttributeNames()) {
      if (attr.startsWith('data-')) a.setAttribute(attr, el.getAttribute(attr)!)
    }
    while (el.firstChild) a.appendChild(el.firstChild)
    el.replaceWith(a)
    restore.push({ anchor: a, original: el })
  })

  return () => {
    for (const { anchor, original } of restore) {
      while (anchor.firstChild) original.appendChild(anchor.firstChild)
      anchor.replaceWith(original)
    }
  }
}

/** Trigger a browser download of the attached PDF. */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A lesson's front-matter title as a filename stem, or a fallback. */
export function lessonFileStem(markdown: string): string {
  const title = splitFrontMatter(markdown).data?.title
  const slug = String(title ?? 'lesson')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'lesson'
}
