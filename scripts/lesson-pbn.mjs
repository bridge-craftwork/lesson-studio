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
import { resolveDealLinks, auctionsByDeal } from '../src/dsl/deal-link'

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
  // Which auction belongs to which hand — an explicit `deal:` where the lesson
  // says so, otherwise the nearest preceding hand (see deal-link.ts). A deal
  // with several auctions on it takes the first; the rest still render on the
  // page, they just don't go into that PBN record.
  const { links, errors } = resolveDealLinks(blocks)
  const byDeal = auctionsByDeal(links)

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

    const paired = byDeal.get(block.index)?.[0]
    const bidding = paired == null ? null : safeAuction(blocks.find((b) => b.index === paired)?.body)

    const board = games.length + 1
    const game = pbnGame(hands, {
      event,
      board,
      dealer: bidding?.dealer,
      auction: bidding?.calls,
    })
    if (!game) continue
    games.push(game)
    boards.push({ index: block.index, board, auction: paired ?? null })
  }

  return games.length ? { text: pbnFile(games), boards, links, errors } : null
}

function safeAuction(body) {
  try {
    const { dealer, calls } = parseAuctionBlock(body)
    return { dealer, calls: calls.map(stripAnnotationMarker) }
  } catch {
    return null
  }
}
