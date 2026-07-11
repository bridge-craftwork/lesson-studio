import type { Hand } from './types'

/** Ranks, high to low. Ten is the single character `T`. */
export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const
const RANK_INDEX = new Map<string, number>(RANKS.map((r, i) => [r, i]))

/** High-card points per rank. */
const HCP = new Map([['A', 4], ['K', 3], ['Q', 2], ['J', 1]])

/**
 * Normalize a single suit holding into canonical form: ranks descending, no
 * separators, `T` for ten, `""` for a void. Accepts spaced (`"A Q 5 4"`),
 * packed (`"AQ54"`), lowercase, and `-`/empty for a void.
 * Throws on an illegal rank or a duplicate card.
 */
export function normalizeHolding(input: string): string {
  const raw = input.trim()
  if (raw === '' || raw === '-') return ''
  const ranks = raw.toUpperCase().replace(/10/g, 'T').replace(/[\s]/g, '').split('')
  const seen = new Set<string>()
  for (const r of ranks) {
    if (!RANK_INDEX.has(r)) throw new Error(`illegal rank "${r}" in holding "${input}"`)
    if (seen.has(r)) throw new Error(`duplicate card "${r}" in holding "${input}"`)
    seen.add(r)
  }
  return ranks.sort((a, b) => RANK_INDEX.get(a)! - RANK_INDEX.get(b)!).join('')
}

/** Canonicalize every suit of a hand. */
export function normalizeHand(hand: Hand): Hand {
  return {
    spades: normalizeHolding(hand.spades),
    hearts: normalizeHolding(hand.hearts),
    diamonds: normalizeHolding(hand.diamonds),
    clubs: normalizeHolding(hand.clubs),
  }
}

/** Total cards across the four suits. */
export function cardCount(hand: Hand): number {
  return hand.spades.length + hand.hearts.length + hand.diamonds.length + hand.clubs.length
}

/** High-card points. */
export function handHcp(hand: Hand): number {
  const suits = [hand.spades, hand.hearts, hand.diamonds, hand.clubs]
  let total = 0
  for (const holding of suits) {
    for (const rank of holding) total += HCP.get(rank) ?? 0
  }
  return total
}

/**
 * Contract 2 hand adapter (wire -> component). HandDisplay keeps the same
 * full-word suit keys but each value is an array of rank characters. Because
 * every rank is one character, this is a lossless spread — no parsing.
 */
export function toComponentHand(hand: Hand): {
  spades: string[]
  hearts: string[]
  diamonds: string[]
  clubs: string[]
} {
  return {
    spades: [...hand.spades],
    hearts: [...hand.hearts],
    diamonds: [...hand.diamonds],
    clubs: [...hand.clubs],
  }
}
