import type { ReservedBlock } from './types'

/**
 * Machine-readable descriptions of each block's authorable keys (Contract 1).
 *
 * The keys were previously knowable only by reading the parsers or the contract
 * prose, which is how `columns`/`labels`/`grid` could exist and still be
 * undiscoverable while authoring. This module is the single source the editor's
 * key reference, its autocomplete, and the gallery all read, so a new key shows
 * up in every surface at once.
 *
 * It deliberately does **not** drive parsing. The parsers stay permissive and
 * hand-written (they accept legacy forms this doesn't describe); this is
 * documentation with a type, and it is the parsers that remain authoritative
 * about what actually loads.
 */
export interface BlockKey {
  /** The key as authored, without the colon. */
  name: string
  /** Accepted values, for display: `'N E S W'`, `'2 | 4'`, `'<text>'`. */
  values: string
  /** Default when the key is omitted, if there is a meaningful one. */
  default?: string
  /** One line, written to be read while authoring. */
  doc: string
  required?: boolean
}

export interface BlockSchema {
  tag: ReservedBlock
  /** One line on what the block is for. */
  summary: string
  keys: BlockKey[]
  /** Body content beyond the keys, e.g. "one round of calls per line". */
  bodyDoc?: string
  /** A minimal working body, used as the gallery/insert starting point. */
  example: string
}

const HOLDING = 'ranks, `-` for a void'

export const BLOCK_SCHEMAS: Record<string, BlockSchema> = {
  hand: {
    tag: 'hand',
    summary: 'One hand: four suit holdings, optionally seated and labelled.',
    keys: [
      { name: 'seat', values: 'N E S W', doc: 'Which seat holds it; adds the seat label.' },
      { name: 'label', values: '<text>', doc: 'Caption instead of the seat letter.' },
      {
        name: 'id',
        values: '<name>',
        doc: 'Stable name so an `auction` block can say it is bid on this hand.',
      },
      {
        name: 'marks',
        values: '<suit><rank>=<badge>',
        doc: 'Badge specific cards, e.g. `S9=1` — a "1" on the ♠9.',
      },
      { name: 'S / H / D / C', values: HOLDING, required: true, doc: 'The holding in that suit.' },
    ],
    example: 'seat: S\nS: A Q 9 5 4\nH: K 7 3\nD: A 5\nC: J 8 4',
  },
  hands: {
    tag: 'hands',
    summary: 'Two or more hands arranged on a compass.',
    keys: [
      {
        name: 'layout',
        values: 'NS | EW | all',
        default: 'inferred from the seats present',
        doc: 'Which seats to show.',
      },
      {
        name: 'id',
        values: '<name>',
        doc: 'Stable name so an `auction` block can say it is bid on this deal.',
      },
      {
        name: 'N / E / S / W',
        values: 'S:… H:… D:… C:…',
        required: true,
        doc: "That seat's holding, all four suits on one line. At least two seats.",
      },
    ],
    example: 'layout: NS\nN: S:K T 6  H:J T 9 2  D:Q J  C:K 7 6 3\nS: S:A Q  H:A 5  D:8 7 4 3  C:Q J T 9 5',
  },
  auction: {
    tag: 'auction',
    summary: 'A bidding table, written as a flat dealer-first list of calls.',
    keys: [
      { name: 'dealer', values: 'N E S W', required: true, doc: 'Makes the first call.' },
      {
        name: 'columns',
        values: '2 | 4',
        default: '4',
        doc: '2 = the two-column uncontested print form. Competitive auctions fall back to 4.',
      },
      {
        name: 'labels',
        values: '<left>, <right>',
        default: 'the two seats’ compass letters',
        doc: 'Header labels for the two-column form, e.g. `Opener, Responder`.',
      },
      {
        name: 'grid',
        values: 'on | off',
        default: 'on',
        doc: 'off = no gridlines and no header bar, as printed teaching material does.',
      },
      {
        name: 'deal',
        values: '<hand id> | none',
        default: 'the nearest preceding hand',
        doc: 'Which hand this auction is bid on. Pairs them for PBN export and the PDF click map.',
      },
    ],
    bodyDoc:
      'Calls in bidding order from the dealer, conventionally one round per line. ' +
      '`2D =1=` keys a numbered note after a `---` line; `2D!` marks an alert with ' +
      'no note text; `AP` closes an auction.',
    example: 'dealer: N\ncolumns: 2\nlabels: Opener, Responder\ngrid: off\n1C   P    1S   P\n1NT  P    2D! =1= P\n---\n1. New Minor Forcing — artificial and invitational.',
  },
  'response-box': {
    tag: 'response-box',
    summary: 'A convention response table: each call and what it shows.',
    keys: [
      { name: 'title', values: '<text>', required: true, doc: 'Heading for the box.' },
      {
        name: '<call> | <meaning>',
        values: 'one row per line',
        required: true,
        doc: 'Left of the `|` renders as bid notation, right as prose.',
      },
    ],
    bodyDoc: 'Text after a `---` line becomes a footer note.',
    example: 'title: Opener’s rebids\n2H | Four hearts\n2S | Three-card spade support\n2NT | Minimum, neither',
  },
  quiz: {
    tag: 'quiz',
    summary: 'An embedded quiz question (Contract 3 JSON).',
    keys: [],
    bodyDoc: 'The body is quiz/v1 JSON, not key lines. Phase 2 adds a picker that writes it.',
    example: '{ "v": "quiz/v1", "prompt": "…", "answer": "…" }',
  },
  row: {
    tag: 'row',
    summary: 'Places blocks side by side. Uses a four-backtick fence.',
    keys: [],
    bodyDoc:
      'Contains other blocks in three-backtick fences, plus any prose between them. ' +
      'Each nested block becomes a column.',
    example: '```hand\nseat: S\nS: A Q 9 5 4\nH: K 7 3\nD: A 5\nC: J 8 4\n```\n\nProse beside the hand.',
  },
  pagebreak: {
    tag: 'pagebreak',
    summary: 'Forces a page break in print. The body is empty.',
    keys: [],
    example: '',
  },
  deal: {
    tag: 'deal',
    summary: 'A referenced deal. Reserved — structurally linted, not resolved until Phase 2.',
    keys: [],
    example: '',
  },
}

/** The schema for a block tag, or undefined if it isn't a reserved block. */
export function blockSchema(tag: string): BlockSchema | undefined {
  return BLOCK_SCHEMAS[tag]
}

/**
 * Key names a partially-typed prefix could become, for autocomplete. Matches on
 * a prefix rather than a substring so typing `co` offers `columns` but typing
 * `l` doesn't offer every key containing an l. Keys whose "name" is a body-line
 * pattern rather than a literal key (`S / H / D / C`) are excluded — you can't
 * complete those.
 */
export function completions(tag: string, prefix: string): BlockKey[] {
  const schema = blockSchema(tag)
  if (!schema) return []
  const p = prefix.trim().toLowerCase()
  return schema.keys.filter(
    (k) => /^[a-z-]+$/.test(k.name) && (p === '' || k.name.toLowerCase().startsWith(p))
  )
}
