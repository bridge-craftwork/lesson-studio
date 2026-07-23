import { describe, it, expect } from 'vitest'
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFString } from 'pdf-lib'
import { readBlockPositions, BLOCK_URI_SCHEME } from './block-map.mjs'

/**
 * Build a PDF carrying link annotations, standing in for what Chrome's print
 * engine emits. Lets the fragment handling be tested without a browser — and
 * without waiting for a lesson that happens to overflow a column.
 */
async function pdfWithLinks(pages) {
  const pdf = await PDFDocument.create()
  for (const links of pages) {
    const page = pdf.addPage([612, 792])
    const annots = links.map(({ index, rect }) =>
      pdf.context.register(
        pdf.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: rect,
          Border: [0, 0, 0],
          A: { Type: 'Action', S: 'URI', URI: PDFString.of(`${BLOCK_URI_SCHEME}:${index}`) },
        })
      )
    )
    page.node.set(PDFName.of('Annots'), pdf.context.obj(annots))
  }
  return pdf.save()
}

const block = (index, kind = 'hand') => ({ index, kind, body: `#${index}` })

describe('block click map', () => {
  it('records page and rect for a block laid out once', async () => {
    const bytes = await pdfWithLinks([[{ index: 0, rect: [10, 20, 110, 220] }]])
    const map = await readBlockPositions(bytes, [block(0)])
    expect(map.blocks[0]).toMatchObject({ index: 0, page: 1, rect: [10, 20, 110, 220] })
    expect(map.blocks[0].fragments).toBeUndefined()
    expect(map.unlocated).toEqual([])
    expect(map.fragmented).toEqual([])
  })

  it('keeps every piece when a block fragments, and reports the largest as rect', async () => {
    // `break-inside: avoid` is a request; a block taller than its column splits
    // anyway and the engine emits one annotation per piece. The old code kept
    // whichever came last, silently recording half the block.
    const bytes = await pdfWithLinks([
      [
        { index: 0, rect: [10, 400, 110, 700] }, // 100 x 300 — the larger piece
        { index: 0, rect: [200, 500, 300, 700] }, // 100 x 200
      ],
    ])
    const map = await readBlockPositions(bytes, [block(0)])
    expect(map.fragmented).toEqual([0])
    expect(map.blocks[0].rect).toEqual([10, 400, 110, 700])
    expect(map.blocks[0].fragments).toEqual([
      { page: 1, rect: [10, 400, 110, 700] },
      { page: 1, rect: [200, 500, 300, 700] },
    ])
  })

  it('handles a block fragmenting across a page boundary', async () => {
    const bytes = await pdfWithLinks([
      [{ index: 0, rect: [10, 36, 110, 300] }],
      [{ index: 0, rect: [10, 500, 110, 756] }],
    ])
    const map = await readBlockPositions(bytes, [block(0)])
    expect(map.blocks[0].fragments.map((f) => f.page)).toEqual([1, 2])
    // Largest piece wins: 264 tall on page 1 vs 256 on page 2.
    expect(map.blocks[0].page).toBe(1)
    expect(map.pageCount).toBe(2)
  })

  it('lists a block the engine never placed, and gives it no position', async () => {
    const bytes = await pdfWithLinks([[{ index: 0, rect: [10, 20, 110, 220] }]])
    const map = await readBlockPositions(bytes, [block(0), block(1)])
    expect(map.unlocated).toEqual([1])
    // The body still travels — only the position is missing.
    expect(map.blocks[1]).toMatchObject({ index: 1, body: '#1' })
    expect(map.blocks[1].page).toBeUndefined()
    expect(map.blocks[1].rect).toBeUndefined()
  })

  it('ignores link annotations that are not ours', async () => {
    const pdf = await PDFDocument.create()
    const page = pdf.addPage([612, 792])
    page.node.set(
      PDFName.of('Annots'),
      pdf.context.obj([
        pdf.context.register(
          pdf.context.obj({
            Type: 'Annot',
            Subtype: 'Link',
            Rect: [0, 0, 10, 10],
            A: { Type: 'Action', S: 'URI', URI: PDFString.of('https://example.com') },
          })
        ),
      ])
    )
    const map = await readBlockPositions(await pdf.save(), [block(0)])
    expect(map.unlocated).toEqual([0])
  })

  it('reports page size per page, in PDF points', async () => {
    const bytes = await pdfWithLinks([[], []])
    const map = await readBlockPositions(bytes, [])
    expect(map.pageSize).toEqual([[612, 792], [612, 792]])
    expect(map.coordinateSpace).toBe('pdf-points, origin bottom-left')
    expect(map.version).toBe(1)
  })
})
