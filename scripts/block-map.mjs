/**
 * Build a click map for a rendered lesson: every bridge block's page and
 * position in the printed PDF, alongside its DSL source.
 *
 * The hard part is pagination. The print view is CSS multicol under `@page`, so
 * the browser's print engine decides where pages break — and `break-inside:
 * avoid` moves blocks around. JS can't observe any of that, which makes
 * measuring the DOM correct only for single-page lessons.
 *
 * So we let the print engine tell us. Each block is wrapped in a link before
 * printing; Chrome emits a PDF link annotation per link, attributed to the page
 * the engine actually laid it on, with a rect in PDF space. Reading those back
 * gives exact positions for any pagination, for free.
 *
 * The links are left in the PDF deliberately: a viewer that surfaces the
 * `lesson-block:<n>` URI turns the printed handout into something tappable
 * without any companion file at all.
 */
import { PDFDocument, PDFName, PDFArray, PDFDict } from 'pdf-lib'

export const BLOCK_MAP_ATTACHMENT = 'lesson-blocks.json'
export const BLOCK_URI_SCHEME = 'lesson-block'

/**
 * Wrap each leaf bridge block in an anchor and return its tag and body, in
 * document order. Runs inside the page.
 *
 * Only *leaf* blocks are wrapped: a `row` contains other blocks, and nested
 * anchors are invalid HTML that Chrome silently un-nests. The leaves are also
 * what you'd tap — the hand inside the row, not the row.
 */
export async function markBlocks(page) {
  return page.evaluate((scheme) => {
    const leaves = [...document.querySelectorAll('[data-block-tag]')].filter(
      (el) => !el.querySelector('[data-block-tag]')
    )
    return leaves.map((el, i) => {
      const a = document.createElement('a')
      a.href = `${scheme}:${i}`
      // Replace the element rather than wrapping it: the print stylesheet
      // selects the direct multicol child (`.ProseMirror > *:has(...)`) to make
      // a row span all columns, so an extra level of nesting would break that
      // layout. Carrying the classes over keeps every print rule matching.
      a.className = el.className
      a.setAttribute('style', 'color:inherit;text-decoration:none;display:block')
      for (const attr of el.getAttributeNames()) {
        if (attr.startsWith('data-')) a.setAttribute(attr, el.getAttribute(attr))
      }
      while (el.firstChild) a.appendChild(el.firstChild)
      el.replaceWith(a)
      return { index: i, kind: el.getAttribute('data-block-tag'), body: el.getAttribute('data-block-body') ?? '' }
    })
  }, BLOCK_URI_SCHEME)
}

/**
 * Read back the link annotations Chrome emitted, pairing each block with its
 * page and rect. `rect` is `[x1, y1, x2, y2]` in PDF points, origin at the
 * page's bottom-left — PDF's own convention, not the DOM's.
 */
export async function readBlockPositions(pdfBytes, blocks) {
  const pdf = await PDFDocument.load(pdfBytes)
  const byIndex = new Map()

  pdf.getPages().forEach((page, pageIdx) => {
    const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray)
    for (let i = 0; i < (annots?.size() ?? 0); i++) {
      const annot = annots.lookup(i, PDFDict)
      const uri = annot
        .lookupMaybe(PDFName.of('A'), PDFDict)
        ?.lookup(PDFName.of('URI'))
        ?.decodeText?.()
      if (!uri?.startsWith(`${BLOCK_URI_SCHEME}:`)) continue

      const index = Number(uri.slice(BLOCK_URI_SCHEME.length + 1))
      const rect = annot
        .lookup(PDFName.of('Rect'), PDFArray)
        .asArray()
        .map((n) => Math.round(n.asNumber() * 100) / 100)
      byIndex.set(index, { page: pageIdx + 1, rect })
    }
  })

  const located = blocks.map((b) => ({ ...b, ...(byIndex.get(b.index) ?? {}) }))
  return {
    pageSize: pdf.getPages().map((p) => [
      Math.round(p.getWidth() * 100) / 100,
      Math.round(p.getHeight() * 100) / 100,
    ]),
    pageCount: pdf.getPageCount(),
    coordinateSpace: 'pdf-points, origin bottom-left',
    blocks: located,
    // Honest about coverage: a block the engine gave no annotation for has no
    // page/rect, and a consumer should know that rather than infer position 0.
    unlocated: located.filter((b) => b.page == null).map((b) => b.index),
  }
}
