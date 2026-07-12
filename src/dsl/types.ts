/**
 * Contract 1 — Lesson DSL wire types.
 *
 * These are the *wire* (source/markdown) representations. Component prop shapes
 * (e.g. the array-valued hand) live in Contract 2 and are produced by the
 * adapters in this module; see src/dsl/hand.ts.
 */

/** The four seats. */
export type Seat = 'N' | 'E' | 'S' | 'W'

/** A call: a level+strain bid, or pass/double/redouble. Matches Contract 3. */
export type Call = string // validated against CALL_RE in dsl/call.ts

/** Skill level vocabulary — shared with the taxonomy (Contract 4). */
export type Level = 'basic' | 'intermediate' | 'advanced' | 'expert'

/**
 * Canonical Hand — wire form. Each suit is a rank string, ranks descending,
 * ten as `T`, void `""`. Frozen across Contracts 1/3/4.
 */
export interface Hand {
  spades: string
  hearts: string
  diamonds: string
  clubs: string
}

/** Lesson front matter (Contract 4 owns the schema). */
export interface FrontMatter {
  title: string
  skill_paths: string[]
  primary?: string
  level: Level
  author: string
  status: 'draft' | 'published'
  'reviewed-by': string
  /** Print-layout hint: number of newsletter columns in the print view (default 2). */
  columns?: number
}

/** The reserved fenced-block language tags (Contract 1). */
export const RESERVED_BLOCKS = [
  'hand',
  'hands',
  'auction',
  'response-box',
  'deal',
  'quiz',
  'pagebreak',
] as const

export type ReservedBlock = (typeof RESERVED_BLOCKS)[number]

/** Which blocks are active (resolvable/rendered) in Phase 1 / v1. */
export const V1_ACTIVE_BLOCKS: ReservedBlock[] = [
  'hand',
  'hands',
  'auction',
  'response-box',
  'quiz',
  'pagebreak',
]

export function isReservedBlock(tag: string): tag is ReservedBlock {
  return (RESERVED_BLOCKS as readonly string[]).includes(tag)
}
