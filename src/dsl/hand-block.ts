import type { Hand, Seat } from './types'
import { normalizeHolding, RANKS } from './hand'

/** A per-card badge annotation, keyed by card code (`"S9"`, `"HT"`). */
export type HandMarks = Record<string, string>

/**
 * The parsed content of a `hand` block (Contract 1). `hand` is normalized;
 * `seat`/`label` are optional keys; `marks` are per-card badge annotations
 * (e.g. length-point counts on the 5th/6th cards of a suit).
 */
export interface HandBlock {
  seat?: Seat
  label?: string
  /** Optional stable name, so an `auction` block can say it's bid on this hand. */
  id?: string
  hand: Hand
  marks?: HandMarks
}

const SEATS: Seat[] = ['N', 'E', 'S', 'W']
const SUITS = ['S', 'H', 'D', 'C'] as const
const SUIT_LINE = /^([SHDC]):\s*(.*)$/
const KEY_LINE = /^(seat|label|id):\s*(.*)$/
const MARKS_LINE = /^marks:\s*(.*)$/
// One mark token: <suit><rank>=<badge>, e.g. S9=1 or ST=2 (ten as T or 10).
const MARK_TOKEN = /^([SHDC])(10|[AKQJT2-9])=(\S+)$/

const rankIndex = (r: string) => RANKS.indexOf(r as (typeof RANKS)[number])

/**
 * Parse a `hand` block body into a normalized HandBlock. Permissive on input
 * (spaced/packed holdings, any line order, missing suits default to void);
 * `serializeHandBlock` renders the canonical form. Throws on an illegal seat,
 * holding, or mark.
 */
export function parseHandBlock(body: string): HandBlock {
  const holdings: Record<'S' | 'H' | 'D' | 'C', string> = { S: '', H: '', D: '', C: '' }
  let seat: Seat | undefined
  let label: string | undefined
  let id: string | undefined
  let marks: HandMarks | undefined

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    if (line === '') continue

    const key = line.match(KEY_LINE)
    if (key) {
      if (key[1] === 'seat') {
        const s = key[2].trim().toUpperCase()
        if (!SEATS.includes(s as Seat)) throw new Error(`illegal seat "${key[2]}" in hand block`)
        seat = s as Seat
      } else if (key[1] === 'id') {
        id = key[2].trim() || undefined
      } else {
        label = key[2].trim() || undefined
      }
      continue
    }

    const marksMatch = line.match(MARKS_LINE)
    if (marksMatch) {
      marks = parseMarks(marksMatch[1])
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
    id,
    marks,
    hand: {
      spades: holdings.S,
      hearts: holdings.H,
      diamonds: holdings.D,
      clubs: holdings.C,
    },
  }
}

function parseMarks(spec: string): HandMarks | undefined {
  const marks: HandMarks = {}
  for (const token of spec.trim().split(/\s+/)) {
    if (token === '') continue
    const m = token.match(MARK_TOKEN)
    if (!m) throw new Error(`bad mark "${token}" — expected <suit><rank>=<badge>, e.g. S9=1`)
    const rank = m[2] === '10' ? 'T' : m[2]
    marks[`${m[1]}${rank}`] = m[3]
  }
  return Object.keys(marks).length ? marks : undefined
}

/** Render a holding as canonical spaced ranks, `-` for a void. */
function holdingLine(holding: string): string {
  return holding === '' ? '-' : [...holding].join(' ')
}

/** Canonical marks line: cards in suit order (S H D C), rank high to low. */
function marksLine(marks: HandMarks): string {
  const entries = Object.entries(marks).sort(([a], [b]) => {
    const s = SUITS.indexOf(a[0] as (typeof SUITS)[number]) - SUITS.indexOf(b[0] as (typeof SUITS)[number])
    return s !== 0 ? s : rankIndex(a[1]) - rankIndex(b[1])
  })
  return `marks: ${entries.map(([card, badge]) => `${card}=${badge}`).join(' ')}`
}

/**
 * Serialize a HandBlock to its canonical body (Contract 1): `seat`/`label`/`id`
 * keys, then the four suit lines in S H D C order, then an optional `marks`
 * line. `parseHandBlock ∘ serializeHandBlock` is the identity on normalized
 * input, and `serializeHandBlock` is idempotent — the `--fix` formatter.
 */
export function serializeHandBlock(block: HandBlock): string {
  const lines: string[] = []
  if (block.seat) lines.push(`seat: ${block.seat}`)
  if (block.label) lines.push(`label: ${block.label}`)
  if (block.id) lines.push(`id: ${block.id}`)
  lines.push(`S: ${holdingLine(block.hand.spades)}`)
  lines.push(`H: ${holdingLine(block.hand.hearts)}`)
  lines.push(`D: ${holdingLine(block.hand.diamonds)}`)
  lines.push(`C: ${holdingLine(block.hand.clubs)}`)
  if (block.marks) lines.push(marksLine(block.marks))
  return lines.join('\n')
}
