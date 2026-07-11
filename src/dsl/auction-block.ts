import type { Seat } from './types'
import { isCall, stripAnnotationMarker, annotationIndex } from './call'

/** A parsed `auction` block (Contract 1). */
export interface AuctionBlock {
  dealer: Seat
  /** Calls in bidding order (dealer first). `AP` is kept verbatim. */
  calls: string[]
  /** Numbered annotation notes, keyed by marker index. */
  notes: Record<number, string>
}

/** Component props for `AuctionTable` (Contract 2): flat bids + meanings. */
export interface AuctionProps {
  dealer: Seat
  bids: string[]
  /** `note` is the annotation number, shared by the superscript and the list. */
  meanings: { position: number; bid: string; meaning: string; note: number }[]
}

const SEATS: Seat[] = ['N', 'E', 'S', 'W']
const NOTE_LINE = /^(\d+)\.\s*(.*)$/

/**
 * Parse an `auction` block body: a `dealer:` key, a flat whitespace-separated
 * list of calls (annotation markers `^n` attached), and optional numbered
 * notes after a `---` separator.
 */
export function parseAuctionBlock(body: string): AuctionBlock {
  const [callPart, notePart = ''] = body.split(/^---\s*$/m)

  let dealer: Seat | undefined
  const calls: string[] = []
  for (const rawLine of callPart.split('\n')) {
    const line = rawLine.trim()
    if (line === '') continue
    const dealerMatch = line.match(/^dealer:\s*(.*)$/)
    if (dealerMatch) {
      const d = dealerMatch[1].trim().toUpperCase()
      if (!SEATS.includes(d as Seat)) throw new Error(`illegal dealer "${dealerMatch[1]}"`)
      dealer = d as Seat
      continue
    }
    for (const token of line.split(/\s+/)) {
      if (token === 'AP' || isCall(stripAnnotationMarker(token))) calls.push(token)
      else throw new Error(`illegal call "${token}" in auction`)
    }
  }
  if (!dealer) throw new Error('auction block missing dealer')

  const notes: Record<number, string> = {}
  for (const rawLine of notePart.split('\n')) {
    const m = rawLine.trim().match(NOTE_LINE)
    if (m) notes[Number(m[1])] = m[2]
  }

  return { dealer, calls, notes }
}

/** Adapt a parsed auction to `AuctionTable` props (Contract 2). */
export function toAuctionProps(block: AuctionBlock): AuctionProps {
  const bids = block.calls.map(stripAnnotationMarker)
  const meanings = block.calls
    .map((call, position) => {
      const idx = annotationIndex(call)
      return idx != null && block.notes[idx]
        ? { position, bid: stripAnnotationMarker(call), meaning: block.notes[idx], note: idx }
        : null
    })
    .filter((m): m is AuctionProps['meanings'][number] => m !== null)
  return { dealer: block.dealer, bids, meanings }
}
