import type { Hand, Seat } from './types'
import { normalizeHolding } from './hand'

/** A parsed `hands` block (Contract 1). */
export interface HandsBlock {
  layout?: 'NS' | 'EW' | 'all'
  hands: Partial<Record<Seat, Hand>>
  /** Optional stable name, so an `auction` block can say it's bid on this deal. */
  id?: string
}

const SEATS: Seat[] = ['N', 'E', 'S', 'W']
const SEAT_LINE = /^([NESW]):\s*(.*)$/
const SUIT_GROUP = /([SHDC]):\s*([AKQJT2-9\s-]*?)(?=\s+[SHDC]:|$)/g

/**
 * Parse a `hands` block body: an optional `layout:` key and one line per seat,
 * `N: S:… H:… D:… C:…`. Missing suits default to void.
 */
export function parseHandsBlock(body: string): HandsBlock {
  let layout: HandsBlock['layout'] | undefined
  let id: string | undefined
  const hands: Partial<Record<Seat, Hand>> = {}

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    if (line === '') continue

    const layoutMatch = line.match(/^layout:\s*(NS|EW|all)\s*$/)
    if (layoutMatch) {
      layout = layoutMatch[1] as HandsBlock['layout']
      continue
    }

    const idMatch = line.match(/^id:\s*(.*)$/)
    if (idMatch) {
      id = idMatch[1].trim() || undefined
      continue
    }

    const seat = line.match(SEAT_LINE)
    if (!seat || !SEATS.includes(seat[1] as Seat)) {
      throw new Error(`unrecognized line in hands block: "${line}"`)
    }
    const holdings: Record<string, string> = { S: '', H: '', D: '', C: '' }
    for (const m of seat[2].matchAll(SUIT_GROUP)) {
      holdings[m[1]] = normalizeHolding(m[2])
    }
    hands[seat[1] as Seat] = {
      spades: holdings.S,
      hearts: holdings.H,
      diamonds: holdings.D,
      clubs: holdings.C,
    }
  }

  if (Object.keys(hands).length < 2) throw new Error('hands block needs at least two seats')
  return { layout, hands, id }
}
