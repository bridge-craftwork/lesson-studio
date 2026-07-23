/**
 * Turn a lesson's hand and hands blocks into a PBN file, so PBN-reading tools
 * consume lesson PDFs with no markdown parser involved.
 *
 * Board numbers are the blocks' order in the lesson, which is the only stable
 * identity a lesson hand has — it is teaching material, not a session record.
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
 * `blocks` is the click-map block list — `{ kind, body }` in document order —
 * so the PBN's board numbers line up with the map's, and a tool that hit-tests
 * a hand can find the matching PBN record by board.
 */
export function lessonPbn(blocks, { event } = {}) {
  // A lesson's auction, if it has exactly one, applies to its hands: teaching
  // material shows a hand and the bidding it produces. With several auctions
  // the pairing is ambiguous, so no auction is attached rather than a wrong one.
  const auctions = blocks.filter((b) => b.kind === 'auction')
  const single = auctions.length === 1 ? safeAuction(auctions[0].body) : null

  const games = []
  let board = 0
  for (const block of blocks) {
    board += 1
    try {
      if (block.kind === 'hand') {
        const { seat, hand } = parseHandBlock(block.body)
        const game = pbnGame({ [seat ?? 'S']: hand }, {
          event,
          board,
          dealer: single?.dealer,
          auction: single?.calls,
        })
        if (game) games.push(game)
      } else if (block.kind === 'hands') {
        const { hands } = parseHandsBlock(block.body)
        const game = pbnGame(hands, {
          event,
          board,
          dealer: single?.dealer,
          auction: single?.calls,
        })
        if (game) games.push(game)
      }
    } catch {
      // A block that won't parse simply contributes no deal. The render itself
      // already fails loudly on unparseable blocks, so this can't hide a fault.
    }
  }

  return games.length ? pbnFile(games) : null
}

function safeAuction(body) {
  try {
    const { dealer, calls } = parseAuctionBlock(body)
    return { dealer, calls: calls.map(stripAnnotationMarker) }
  } catch {
    return null
  }
}
