import { parseAuctionBlock } from './auction-block'
import { parseHandBlock } from './hand-block'
import { parseHandsBlock } from './hands-block'

/**
 * Pair each `auction` block with the hand it is bid on.
 *
 * This can't live in a block parser: a parser sees one body, and the pairing is
 * a relationship between blocks. It's resolved over the whole document instead,
 * by the pipeline that has all of them.
 *
 * The rule is designed so existing lessons need no edits:
 *
 * - `deal: <id>` on the auction pairs it with the `hand`/`hands` block carrying
 *   that `id`, wherever it sits.
 * - `deal: none` opts out — the auction is deliberately unpaired.
 * - Otherwise the auction pairs with the **nearest preceding** hand block, which
 *   is how teaching material already reads: show a hand, then bid it.
 * - An auction with no preceding hand is simply unpaired. That is the normal
 *   case for an opening illustration, not an error.
 */

/** A block in document order — the shape the print pass already produces. */
export interface BlockRef {
  index: number
  kind: string
  body: string
}

export interface DealLink {
  /** `index` of the auction block. */
  auction: number
  /** `index` of the hand/hands block it's bid on, or null if unpaired. */
  deal: number | null
  /** True when the lesson said so explicitly, false when inferred by proximity. */
  explicit: boolean
}

export interface DealLinkResult {
  links: DealLink[]
  /** Human-readable problems: unknown ids, duplicate ids. Never throws. */
  errors: string[]
}

const HAND_KINDS = new Set(['hand', 'hands'])

/** The `id` a hand/hands block declares, or undefined. Unparseable → undefined. */
function handId(block: BlockRef): string | undefined {
  try {
    return block.kind === 'hand' ? parseHandBlock(block.body).id : parseHandsBlock(block.body).id
  } catch {
    return undefined
  }
}

/** The `deal` an auction declares, or undefined. Unparseable → undefined. */
function auctionDeal(block: BlockRef): string | undefined {
  try {
    return parseAuctionBlock(block.body).deal
  } catch {
    return undefined
  }
}

/**
 * Resolve every auction's deal. Collects problems rather than throwing, so a
 * render is never blocked by a bad reference — the lint reports them instead.
 */
export function resolveDealLinks(blocks: BlockRef[]): DealLinkResult {
  const errors: string[] = []

  // Index the named hands first, so a `deal:` can point forwards as well as back.
  const byId = new Map<string, number>()
  for (const block of blocks) {
    if (!HAND_KINDS.has(block.kind)) continue
    const id = handId(block)
    if (!id) continue
    if (byId.has(id)) errors.push(`duplicate hand id "${id}"`)
    else byId.set(id, block.index)
  }

  const links: DealLink[] = []
  let lastHand: number | null = null
  for (const block of blocks) {
    if (HAND_KINDS.has(block.kind)) {
      lastHand = block.index
      continue
    }
    if (block.kind !== 'auction') continue

    const declared = auctionDeal(block)
    if (declared === 'none') {
      links.push({ auction: block.index, deal: null, explicit: true })
    } else if (declared) {
      const target = byId.get(declared)
      if (target == null) {
        errors.push(`auction references unknown hand id "${declared}"`)
        links.push({ auction: block.index, deal: null, explicit: true })
      } else {
        links.push({ auction: block.index, deal: target, explicit: true })
      }
    } else {
      links.push({ auction: block.index, deal: lastHand, explicit: false })
    }
  }

  return { links, errors }
}

/**
 * Invert the links: for each hand block index, the auctions bid on it, in
 * document order. This is the direction a PBN emitter wants — a deal, and the
 * bidding that goes with it.
 */
export function auctionsByDeal(links: DealLink[]): Map<number, number[]> {
  const out = new Map<number, number[]>()
  for (const link of links) {
    if (link.deal == null) continue
    if (!out.has(link.deal)) out.set(link.deal, [])
    out.get(link.deal)!.push(link.auction)
  }
  return out
}
