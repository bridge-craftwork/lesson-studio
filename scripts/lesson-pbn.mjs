/**
 * Turn a lesson's hand and hands blocks into a PBN file, so PBN-reading tools
 * consume lesson PDFs with no markdown parser involved.
 *
 * Boards are numbered 1..n over the deals actually emitted, **not** by block
 * position: only hand blocks produce records, so position-numbering would leave
 * gaps (boards 3, 7, 12) and plenty of PBN readers assume boards run
 * sequentially from 1. The block a board came from is recorded in the click map
 * instead, which is a better place for a join than a non-standard PBN tag.
 */
import { parseHandBlock } from '../src/dsl/hand-block'
import { parseHandsBlock } from '../src/dsl/hands-block'
import { parseAuctionBlock } from '../src/dsl/auction-block'
import { stripAnnotationMarker } from '../src/dsl/call'
import { pbnGame, pbnFile } from '../src/dsl/pbn'

export const PBN_ATTACHMENT = 'lesson-hands.pbn'

/**
 * PBN for every deal in the lesson, or null if it has no hands at all.
 *
 * `blocks` is the click-map block list — `{ index, kind, body }` in document
 * order. Returns `{ text, boards }`, where `boards` pairs each emitted board
 * with the block index it came from; the caller stamps that onto the click map
 * so a tool that hit-tests a hand can find its PBN record.
 */
export function lessonPbn(blocks, { event } = {}) {
  // A lesson's auction, if it has exactly one, applies to its hands: teaching
  // material shows a hand and the bidding it produces. With several auctions
  // the pairing is ambiguous, so no auction is attached rather than a wrong one.
  const auctions = blocks.filter((b) => b.kind === 'auction')
  const single = auctions.length === 1 ? safeAuction(auctions[0].body) : null

  const games = []
  const boards = []
  for (const block of blocks) {
    let hands = null
    try {
      if (block.kind === 'hand') {
        const { seat, hand } = parseHandBlock(block.body)
        hands = { [seat ?? 'S']: hand }
      } else if (block.kind === 'hands') {
        hands = parseHandsBlock(block.body).hands
      }
    } catch {
      // A block that won't parse simply contributes no deal. The render itself
      // already fails loudly on unparseable blocks, so this can't hide a fault.
      continue
    }
    if (!hands) continue

    const board = games.length + 1
    const game = pbnGame(hands, {
      event,
      board,
      dealer: single?.dealer,
      auction: single?.calls,
    })
    if (!game) continue
    games.push(game)
    boards.push({ index: block.index, board })
  }

  return games.length ? { text: pbnFile(games), boards } : null
}

function safeAuction(body) {
  try {
    const { dealer, calls } = parseAuctionBlock(body)
    return { dealer, calls: calls.map(stripAnnotationMarker) }
  } catch {
    return null
  }
}
