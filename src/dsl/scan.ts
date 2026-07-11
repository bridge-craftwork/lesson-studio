import { isReservedBlock, type ReservedBlock } from './types'

export interface ReservedBlockOccurrence {
  tag: ReservedBlock
  body: string
  /** 0-based line index of the opening fence in the source. */
  line: number
}

/**
 * Find reserved bridge blocks in a lesson's markdown by scanning fenced code
 * blocks whose info string is a reserved tag. This is a lightweight source
 * scan for tooling (lint, indexing); the editor itself parses via remark.
 */
export function scanReservedBlocks(markdown: string): ReservedBlockOccurrence[] {
  const lines = markdown.split('\n')
  const out: ReservedBlockOccurrence[] = []
  let i = 0
  while (i < lines.length) {
    const open = lines[i].match(/^(`{3,}|~{3,})\s*([A-Za-z-]+)\s*$/)
    if (open) {
      const fence = open[1][0].repeat(open[1].length)
      const tag = open[2]
      const start = i
      i++
      const bodyLines: string[] = []
      while (i < lines.length && !lines[i].startsWith(fence)) {
        bodyLines.push(lines[i])
        i++
      }
      // skip the closing fence, if present
      if (i < lines.length) i++
      if (isReservedBlock(tag)) {
        out.push({ tag, body: bodyLines.join('\n'), line: start })
      }
      continue
    }
    i++
  }
  return out
}
