import { splitRedSuits } from './suits'

/**
 * Inline notation for free-text table cells (Contract 1 `table`): checkboxes,
 * and short holdings with a highlighted card.
 *
 * - A cell that is exactly `[x]` (or `✓`) is a ticked box; exactly `[ ]` is an
 *   empty one. Checkbox is a whole-cell value, never inline, so a bracketed
 *   card inside a holding can't be mistaken for one.
 * - `S:KQ62` anywhere in the text is a holding — suit letter, colon, ranks with
 *   no spaces — rendered as the suit glyph and its cards. Wrapping a card in
 *   brackets highlights it: `D:[K]Q62` is "lead the king". Ten is `T` or `10`;
 *   `x` is a small card, as in hand blocks.
 */
export type CellSegment =
  | { kind: 'text'; text: string; red?: boolean }
  | { kind: 'check'; checked: boolean }
  | { kind: 'holding'; suit: HoldingSuit; cards: HoldingCard[] }

export type HoldingSuit = 'S' | 'H' | 'D' | 'C'
export interface HoldingCard {
  /** As displayed: ten is `10`. */
  rank: string
  highlight?: boolean
}

const CHECKED = /^(\[[xX]\]|✓|✔)$/
const UNCHECKED = /^\[ \]$/

/** A card unit: a rank, or a rank wrapped in brackets to highlight it. */
const CARD = String.raw`(?:10|[AKQJT2-9xX])`
// The suit letter must not continue a word (`ABC:` is not a club holding), and
// the ranks must end the token (`S:Ace` is prose, not ♠A + "ce").
const HOLDING_RE = new RegExp(
  String.raw`(?<![A-Za-z0-9])([SHDC]):((?:\[${CARD}\]|${CARD})+|-)(?![A-Za-z0-9\[])`,
  'g'
)
const CARD_RE = new RegExp(String.raw`\[(${CARD})\]|(${CARD})`, 'g')

/** Is this whole cell a checkbox value (`[x]`, `✓`, `[ ]`)? */
export function isCheckCell(text: string): boolean {
  const t = text.trim()
  return CHECKED.test(t) || UNCHECKED.test(t)
}

function holdingCards(ranks: string): HoldingCard[] {
  if (ranks === '-') return []
  const cards: HoldingCard[] = []
  for (const m of ranks.matchAll(CARD_RE)) {
    const raw = (m[1] ?? m[2]).toUpperCase()
    const rank = raw === 'T' ? '10' : raw === 'X' ? 'x' : raw
    cards.push(m[1] ? { rank, highlight: true } : { rank })
  }
  return cards
}

/** Split a cell's text into renderable segments. */
export function parseCellText(text: string): CellSegment[] {
  const t = text.trim()
  if (CHECKED.test(t)) return [{ kind: 'check', checked: true }]
  if (UNCHECKED.test(t)) return [{ kind: 'check', checked: false }]

  const out: CellSegment[] = []
  const pushText = (s: string) => {
    for (const seg of splitRedSuits(s)) out.push({ kind: 'text', ...seg })
  }
  let last = 0
  for (const m of text.matchAll(HOLDING_RE)) {
    if (m.index! > last) pushText(text.slice(last, m.index))
    out.push({ kind: 'holding', suit: m[1] as HoldingSuit, cards: holdingCards(m[2]) })
    last = m.index! + m[0].length
  }
  if (last < text.length) pushText(text.slice(last))
  return out
}
