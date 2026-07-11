import type { Hand, Seat } from './types'
import { normalizeHolding } from './hand'

/**
 * The parsed content of a `hand` block (Contract 1). `hand` is normalized;
 * `seat`/`label` are the optional block keys.
 */
export interface HandBlock {
  seat?: Seat
  label?: string
  hand: Hand
}

const SEATS: Seat[] = ['N', 'E', 'S', 'W']
const SUIT_LINE = /^([SHDC]):\s*(.*)$/
const KEY_LINE = /^(seat|label):\s*(.*)$/

/**
 * Parse a `hand` block body into a normalized HandBlock. Permissive on input
 * (spaced/packed holdings, any line order, missing suits default to void);
 * `serializeHandBlock` renders the canonical form. Throws on an illegal seat
 * or holding.
 */
export function parseHandBlock(body: string): HandBlock {
  const holdings: Record<'S' | 'H' | 'D' | 'C', string> = { S: '', H: '', D: '', C: '' }
  let seat: Seat | undefined
  let label: string | undefined

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    if (line === '') continue

    const key = line.match(KEY_LINE)
    if (key) {
      if (key[1] === 'seat') {
        const s = key[2].trim().toUpperCase()
        if (!SEATS.includes(s as Seat)) throw new Error(`illegal seat "${key[2]}" in hand block`)
        seat = s as Seat
      } else {
        label = key[2].trim() || undefined
      }
      continue
    }

    const suit = line.match(SUIT_LINE)
    if (suit) {
      holdings[suit[1] as 'S' | 'H' | 'D' | 'C'] = normalizeHolding(suit[2])
      continue
    }

    throw new Error(`unrecognized line in hand block: "${line}"`)
  }

  return {
    seat,
    label,
    hand: {
      spades: holdings.S,
      hearts: holdings.H,
      diamonds: holdings.D,
      clubs: holdings.C,
    },
  }
}

/** Render a holding as canonical spaced ranks, `-` for a void. */
function holdingLine(holding: string): string {
  return holding === '' ? '-' : [...holding].join(' ')
}

/**
 * Serialize a HandBlock to its canonical body (Contract 1): `seat` then
 * `label` keys if present, then the four suit lines in S H D C order, ranks
 * single-space separated, `-` for a void, every suit line present.
 * `parseHandBlock ∘ serializeHandBlock` is the identity on normalized input,
 * and `serializeHandBlock` is idempotent — this is the `--fix` formatter.
 */
export function serializeHandBlock(block: HandBlock): string {
  const lines: string[] = []
  if (block.seat) lines.push(`seat: ${block.seat}`)
  if (block.label) lines.push(`label: ${block.label}`)
  lines.push(`S: ${holdingLine(block.hand.spades)}`)
  lines.push(`H: ${holdingLine(block.hand.hearts)}`)
  lines.push(`D: ${holdingLine(block.hand.diamonds)}`)
  lines.push(`C: ${holdingLine(block.hand.clubs)}`)
  return lines.join('\n')
}
