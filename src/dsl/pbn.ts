import type { Hand, Seat } from './types'

/**
 * Emit a lesson's hands as PBN, so PBN-reading tools can consume lesson PDFs
 * without a markdown parser.
 *
 * Lesson hands are usually *partial* — one seat's 13 cards, no full deal —
 * which PBN accommodates: an unknown hand in a `Deal` tag is written `-`. That
 * is the honest encoding, and it is why this never invents cards to fill a
 * deal out.
 */

const SEAT_ORDER: Seat[] = ['N', 'E', 'S', 'W']

/** One hand as a PBN holding: `AQ954.K73.A5.J84`, voids as empty. */
export function pbnHolding(hand: Hand): string {
  return [hand.spades, hand.hearts, hand.diamonds, hand.clubs]
    .map((h) => (h === '-' ? '' : h))
    .join('.')
}

/**
 * A PBN `Deal` tag value for a set of seats: `N:AQ954.K73.A5.J84 - - -`.
 * Hands are listed clockwise from the first seat named, with `-` for the ones
 * the lesson doesn't specify.
 */
export function pbnDeal(hands: Partial<Record<Seat, Hand>>): string | null {
  const present = SEAT_ORDER.filter((s) => hands[s])
  if (!present.length) return null

  // PBN lists hands clockwise from the tagged seat, so rotate the seat order to
  // start at the first one we actually have.
  const start = SEAT_ORDER.indexOf(present[0])
  const rotated = [...SEAT_ORDER.slice(start), ...SEAT_ORDER.slice(0, start)]
  const holdings = rotated.map((s) => (hands[s] ? pbnHolding(hands[s]!) : '-'))
  return `${present[0]}:${holdings.join(' ')}`
}

export interface PbnGameOptions {
  event?: string
  board?: number
  dealer?: Seat
  /** Calls in bidding order, dealer first — emitted as an `Auction` section. */
  auction?: string[]
}

/**
 * One PBN game record. Emits the mandatory tag set (PBN §3.1) with `?`
 * placeholders for what a lesson doesn't know, which is what PBN exporters
 * conventionally do rather than omitting the tags.
 */
export function pbnGame(
  hands: Partial<Record<Seat, Hand>>,
  { event, board = 1, dealer, auction }: PbnGameOptions = {}
): string | null {
  const deal = pbnDeal(hands)
  if (!deal) return null

  const lines = [
    `[Event "${escapePbn(event ?? '?')}"]`,
    '[Site "?"]',
    '[Date "????.??.??"]',
    `[Board "${board}"]`,
    '[West "?"]',
    '[North "?"]',
    '[East "?"]',
    '[South "?"]',
    `[Dealer "${dealer ?? '?'}"]`,
    '[Vulnerable "?"]',
    `[Deal "${deal}"]`,
    '[Scoring "?"]',
    '[Declarer "?"]',
    '[Contract "?"]',
    '[Result "?"]',
  ]

  if (auction?.length && dealer) {
    lines.push(`[Auction "${dealer}"]`)
    // PBN writes the auction in rounds of four, dealer first.
    for (let i = 0; i < auction.length; i += 4) {
      lines.push(auction.slice(i, i + 4).join(' '))
    }
  }

  return lines.join('\n')
}

/** Join game records into a PBN file — records are separated by a blank line. */
export function pbnFile(games: string[]): string {
  return games.filter(Boolean).join('\n\n') + '\n'
}

/** PBN escapes backslash and double-quote inside tag values. */
function escapePbn(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
