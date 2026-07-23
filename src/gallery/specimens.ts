import type { ReservedBlock } from '@/dsl'

export interface Specimen {
  label: string
  body: string
}

export interface BlockSpecimens {
  tag: ReservedBlock
  title: string
  blurb: string
  specimens: Specimen[]
}

const lines = (...ls: string[]) => ls.join('\n')

/**
 * Fixed specimen data for every Phase-1 DSL block. Each specimen is the raw
 * block body an author would write; the gallery renders it through the same
 * parser + component path a lesson uses.
 */
export const GALLERY: BlockSpecimens[] = [
  {
    tag: 'hand',
    title: 'hand',
    blurb: 'Single-hand fragment. Optional seat/label; HCP shown.',
    specimens: [
      { label: 'balanced 15', body: lines('seat: S', 'S: A Q 5 4', 'H: K J 3', 'D: A 7 2', 'C: Q 8 5') },
      { label: 'shapely, with void', body: lines('label: Opener', 'S: A K Q J 9 8', 'H: A K 5', 'D: Q 4', 'C: -') },
      { label: 'flat minimum', body: lines('S: J 7 3', 'H: Q 9 4', 'D: K 8 5 2', 'C: T 6 3') },
    ],
  },
  {
    tag: 'hands',
    title: 'hands',
    blurb: 'Two- or four-hand compass. West left, South bottom.',
    specimens: [
      {
        label: 'N–S partnership',
        body: lines(
          'layout: NS',
          'N: S:K T 6  H:J T 9 2  D:Q J  C:K 7 6 3',
          'S: S:A Q  H:A 5  D:8 7 4 3  C:Q J T 9 5',
        ),
      },
      {
        label: 'full deal',
        body: lines(
          'layout: all',
          'N: S:A Q  H:A 5  D:8 7 4 3  C:Q J T 9 5',
          'E: S:K T 6  H:J T 9 2  D:Q J  C:K 7 6',
          'S: S:7 5 4  H:K 8 7 4  D:A K 6 5  C:A 2',
          'W: S:J 9 8 3 2  H:Q 6 3  D:T 9 2  C:8 4',
        ),
      },
    ],
  },
  {
    tag: 'auction',
    title: 'auction',
    blurb: 'Flat dealer-first calls; the renderer lays them into W-N-E-S.',
    specimens: [
      {
        label: 'New Minor Forcing',
        body: lines('dealer: N', '1C   P    1S   P', '1NT  P    2D^1  P', '2H', '---', '1. New Minor Forcing — game-forcing'),
      },
      {
        label: 'competitive, All Pass',
        body: lines('dealer: E', '1H   1S   X^1  2S', '3H   AP', '---', '1. Negative double, promises 4 spades'),
      },
      {
        label: 'two-column, unruled (print form)',
        body: lines(
          'dealer: N',
          'columns: 2',
          'labels: Opener, Responder',
          'grid: off',
          '1C   P    1S   P',
          '1NT  P    2D! =1= P',
          '---',
          '1. New Minor Forcing — artificial and invitational',
        ),
      },
      {
        label: 'two-column, E/W are the bidding pair',
        body: lines('dealer: S', 'columns: 2', 'P    1D   P    1S', 'P    1NT  P    2C!'),
      },
      {
        label: 'two-column, passed hand (responder opens with a pass)',
        body: lines('dealer: N', 'columns: 2', 'labels: Opener, Responder', 'P    P    1D   P', '1S   P    1NT  P', '2C'),
      },
      {
        label: 'two-column requested, but competitive → falls back to 4',
        body: lines('dealer: E', 'columns: 2', 'labels: Opener, Responder', '1H   1S   X    2S', '3H   AP'),
      },
    ],
  },
  {
    tag: 'response-box',
    title: 'response-box',
    blurb: 'Titled convention table; calls render with suit glyphs.',
    specimens: [
      {
        label: 'RKCB 1430',
        body: lines(
          'title: Responding to 1430 RKCB',
          '5C | 1 or 4 keycards',
          '5D | 0 or 3 keycards',
          '5H | 2 keycards, without the trump queen',
          '5S | 2 keycards, with the trump queen',
          '---',
          'Count the trump king as a fifth keycard.',
        ),
      },
      {
        label: 'Stayman responses',
        body: lines(
          'title: Opener rebids after Stayman',
          '2D | No four-card major',
          '2H | Four hearts (may also have four spades)',
          '2S | Four spades, denies four hearts',
        ),
      },
    ],
  },
  {
    tag: 'quiz',
    title: 'quiz',
    blurb: 'Embedded Contract 3 quiz/v1 (student variant — answers deferred).',
    specimens: [
      {
        label: 'Responding to 1♣',
        body: JSON.stringify(
          {
            schema: 'quiz/v1',
            type: 'bidding',
            id: '1C_WalshStyle',
            title: 'Exercise One — Responding to 1♣',
            prompt: 'Partner opens 1♣. What do you bid?',
            provenance: {
              source: 'Practice-Bidding-Scenarios',
              pipeline_version: '0.0.0',
              generated: '2026-07-11',
              source_quiz: '1C_WalshStyle',
            },
            items: [
              { hand: { spades: 'AQ', hearts: 'A5', diamonds: '8743', clubs: 'QJT95' }, answer: '1D', explanation: 'Up the line with a real diamond suit and game interest.' },
              { hand: { spades: 'Q98', hearts: 'K73', diamonds: 'Q63', clubs: 'AK86' }, answer: '1D', explanation: 'Walsh: bypass diamonds only with a weak hand — here bid them.' },
            ],
          },
          null,
          2,
        ),
      },
    ],
  },
  {
    tag: 'pagebreak',
    title: 'pagebreak',
    blurb: 'Explicit page break (break-before: page in print).',
    specimens: [{ label: 'divider', body: '' }],
  },
]
