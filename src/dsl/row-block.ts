import { isReservedBlock, type ReservedBlock } from './types'

/** An item inside a `row` block: a prose run or a nested reserved block. */
export type RowItem =
  | { kind: 'prose'; text: string }
  | { kind: 'block'; tag: ReservedBlock; body: string }

/**
 * Parse a `row` block body into an ordered list of items — prose paragraphs and
 * nested reserved blocks (fenced with three backticks inside the row's four).
 * The renderer lays them out side by side.
 */
export function parseRowBlock(body: string): RowItem[] {
  const lines = body.split('\n')
  const items: RowItem[] = []
  let prose: string[] = []

  const flushProse = () => {
    const text = prose.join('\n').trim()
    if (text) items.push({ kind: 'prose', text })
    prose = []
  }

  let i = 0
  while (i < lines.length) {
    const open = lines[i].match(/^(`{3,}|~{3,})\s*([A-Za-z-]+)\s*$/)
    if (open) {
      flushProse()
      const fence = open[1][0].repeat(open[1].length)
      const tag = open[2]
      i++
      const bodyLines: string[] = []
      while (i < lines.length && !lines[i].startsWith(fence)) {
        bodyLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // skip closing fence
      if (isReservedBlock(tag) && tag !== 'row') {
        items.push({ kind: 'block', tag, body: bodyLines.join('\n') })
      }
      continue
    }
    prose.push(lines[i])
    i++
  }
  flushProse()
  return items
}
