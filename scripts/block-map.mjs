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
// readBlockPositions + the map constants now live in the shared, browser-safe
// core so the CLI and the in-browser export share one implementation.
export {
  readBlockPositions,
  BLOCK_MAP_ATTACHMENT,
  BLOCK_URI_SCHEME,
} from '../src/lesson/pdfEmbed'
import { BLOCK_URI_SCHEME } from '../src/lesson/pdfEmbed'


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
