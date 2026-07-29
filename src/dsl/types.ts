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
  /**
   * Body text size in points for print (default 12). The house size is set for
   * senior legibility rather than density — larger than a typical handout.
   */
  'font-size'?: number
  /**
   * Multiplier on `font-size`, for nudging a lesson that just misses a page
   * (default 1). Separate from `font-size` so the base stays a readable,
   * comparable number across the library and the fitting tweak is visible as
   * a tweak.
   */
  'text-scale'?: number
  /**
   * Print top/bottom page margins in inches (default 0.5 each). Widen these to
   * leave room for chrome a downstream tool (pdf-handouts) stamps into the
   * margin, so its header/footer doesn't overlap the lesson.
   */
  'margin-top'?: number
  'margin-bottom'?: number
  /**
   * How much of the lesson's own header to print:
   * `standard` (default) — the full two-row header;
   * `minimal` — title + level only;
   * `none` — no header, e.g. when a presentation tool supplies its own.
   */
  header?: 'standard' | 'minimal' | 'none'
  /** Optional display date shown in the header (free text, e.g. `July 2026`). */
  date?: string
  /**
   * Where quiz answers print: `end` (default) collects them in a section on a
   * later page; `inline` prints each beside its hand; `none` omits them.
   */
  'quiz-answers'?: 'end' | 'inline' | 'none'
}

/** The reserved fenced-block language tags (Contract 1). */
export const RESERVED_BLOCKS = [
  'hand',
  'hands',
  'auction',
  'response-box',
  'deal',
  'quiz',
  'answers',
  'pagebreak',
  'columnbreak',
  'row',
] as const

export type ReservedBlock = (typeof RESERVED_BLOCKS)[number]

/** Which blocks are active (resolvable/rendered) in Phase 1 / v1. */
export const V1_ACTIVE_BLOCKS: ReservedBlock[] = [
  'hand',
  'hands',
  'auction',
  'response-box',
  'quiz',
  'answers',
  'pagebreak',
  'columnbreak',
  'row',
]

/**
 * Layout-control blocks: they shape the page but render no tappable content, so
 * the PDF click map (Contract 5) omits them — a card-play tool would never
 * hit-test a break. Excluded from the block list on both the Playwright and the
 * in-browser map paths, identically, so block indices stay consistent.
 */
export const LAYOUT_BLOCKS: readonly ReservedBlock[] = ['pagebreak', 'columnbreak']

export function isLayoutBlock(tag: string): boolean {
  return (LAYOUT_BLOCKS as readonly string[]).includes(tag)
}

export function isReservedBlock(tag: string): tag is ReservedBlock {
  return (RESERVED_BLOCKS as readonly string[]).includes(tag)
}
