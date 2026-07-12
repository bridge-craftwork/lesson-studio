import { describe, it, expect } from 'vitest'
import { normalizeHolding, normalizeHand, handHcp, cardCount, toComponentHand } from './hand'
import { isCall, stripAnnotationMarker, annotationIndex } from './call'
import { scanReservedBlocks } from './scan'
import { isReservedBlock } from './types'
import { parseHandBlock, serializeHandBlock } from './hand-block'
import { parseRowBlock } from './row-block'
import { validateLesson } from './validate'
import { parseAuctionBlock, toAuctionProps } from './auction-block'
import { parseResponseBox } from './response-box-block'
import { parseHandsBlock } from './hands-block'
import { formatCall, callSegments } from './call'
import { splitRedSuits } from './suits'
import { splitFrontMatter, joinFrontMatter, lessonTitle, serializeFrontMatter } from './front-matter'
import { STARTER_LESSON } from '../editor/starter'

describe('hand notation', () => {
  it('normalizes spaced, packed, and lowercase holdings to canonical descending form', () => {
    expect(normalizeHolding('A Q 5 4')).toBe('AQ54')
    expect(normalizeHolding('qjt95')).toBe('QJT95')
    expect(normalizeHolding('4 A Q 5')).toBe('AQ54')
    expect(normalizeHolding('10 9')).toBe('T9')
  })

  it('treats "-" and empty as a void', () => {
    expect(normalizeHolding('-')).toBe('')
    expect(normalizeHolding('  ')).toBe('')
  })

  it('rejects illegal ranks and duplicates', () => {
    expect(() => normalizeHolding('A X')).toThrow(/illegal rank/)
    expect(() => normalizeHolding('A A')).toThrow(/duplicate/)
  })

  it('computes HCP and card count for a full hand', () => {
    const hand = normalizeHand({ spades: 'AQ54', hearts: 'KJ3', diamonds: 'A72', clubs: 'Q85' })
    expect(cardCount(hand)).toBe(13)
    expect(handHcp(hand)).toBe(4 + 2 + 3 + 1 + 4 + 2) // A Q + K J + A + Q = 16
  })

  it('adapts the wire hand to the component array form (Contract 2)', () => {
    expect(toComponentHand({ spades: 'AQ', hearts: 'A5', diamonds: '8743', clubs: 'QJT95' })).toEqual({
      spades: ['A', 'Q'],
      hearts: ['A', '5'],
      diamonds: ['8', '7', '4', '3'],
      clubs: ['Q', 'J', 'T', '9', '5'],
    })
  })
})

describe('call notation', () => {
  it('accepts legal calls and rejects the rest', () => {
    for (const c of ['1C', '3NT', '7S', 'P', 'X', 'XX']) expect(isCall(c)).toBe(true)
    for (const c of ['8C', '1Z', '', 'pass', '1n']) expect(isCall(c)).toBe(false)
  })

  it('strips and reads annotation markers', () => {
    expect(stripAnnotationMarker('2C^1')).toBe('2C')
    expect(annotationIndex('2C^1')).toBe(1)
    expect(annotationIndex('2C')).toBeNull()
  })
})

describe('hand block parse/serialize', () => {
  const canonical = ['seat: S', 'S: A Q 5 4', 'H: K J 3', 'D: A 7 2', 'C: Q 8 5'].join('\n')

  it('parses keys and holdings', () => {
    const b = parseHandBlock(canonical)
    expect(b.seat).toBe('S')
    expect(b.hand).toEqual({ spades: 'AQ54', hearts: 'KJ3', diamonds: 'A72', clubs: 'Q85' })
  })

  it('serializes to the canonical form (--fix)', () => {
    expect(serializeHandBlock(parseHandBlock(canonical))).toBe(canonical)
  })

  it('round-trips permissive input to canonical (packed, reordered, void, lowercase)', () => {
    const messy = ['C: q85', 'H: KJ3', 'S: aq54', 'D: -', 'seat: s'].join('\n')
    const once = serializeHandBlock(parseHandBlock(messy))
    expect(once).toBe(['seat: S', 'S: A Q 5 4', 'H: K J 3', 'D: -', 'C: Q 8 5'].join('\n'))
    // idempotent: re-running the formatter is a no-op
    expect(serializeHandBlock(parseHandBlock(once))).toBe(once)
  })

  it('rejects an illegal seat', () => {
    expect(() => parseHandBlock('seat: Z\nS: A')).toThrow(/illegal seat/)
  })

  it('parses and round-trips card badges (marks)', () => {
    const b = parseHandBlock('S: A K Q J 9 8\nmarks: S9=1 S8=2')
    expect(b.marks).toEqual({ S9: '1', S8: '2' })
    const canonical = ['S: A K Q J 9 8', 'H: -', 'D: -', 'C: -', 'marks: S9=1 S8=2'].join('\n')
    expect(serializeHandBlock(parseHandBlock(canonical))).toBe(canonical)
    expect(() => parseHandBlock('S: A\nmarks: bogus')).toThrow(/bad mark/)
  })
})

describe('row block', () => {
  it('splits prose and nested reserved blocks in order', () => {
    const body = [
      'Lead-in narrative.',
      '',
      '```response-box',
      'title: T',
      'A | 4',
      '```',
      '',
      '```hand',
      'S: A K',
      '```',
    ].join('\n')
    const items = parseRowBlock(body)
    expect(items.map((i) => i.kind)).toEqual(['prose', 'block', 'block'])
    expect(items[0]).toEqual({ kind: 'prose', text: 'Lead-in narrative.' })
    expect(items[1]).toMatchObject({ kind: 'block', tag: 'response-box' })
    expect(items[2]).toMatchObject({ kind: 'block', tag: 'hand' })
  })
})

describe('call formatting', () => {
  it('renders strains as glyphs and calls as words', () => {
    expect(formatCall('1C')).toBe('1♣')
    expect(formatCall('3NT')).toBe('3NT')
    expect(formatCall('2D^1')).toBe('2♦')
    expect(formatCall('P')).toBe('Pass')
    expect(formatCall('X')).toBe('Dbl')
  })

  it('segments a call so only the red suit glyph is red', () => {
    // level digit stays black; only the diamond glyph is red
    expect(callSegments('2D^1')).toEqual([{ text: '2' }, { text: '♦', red: true }])
    // spades glyph is not red
    expect(callSegments('1S')).toEqual([{ text: '1' }, { text: '♠', red: false }])
    // NT and non-bids are a single black segment
    expect(callSegments('3NT')).toEqual([{ text: '3NT' }])
    expect(callSegments('P')).toEqual([{ text: 'Pass' }])
  })

  it('splits red-suit glyphs out of free text for coloring', () => {
    expect(splitRedSuits('open 1♦; with 3-3 open 1♣')).toEqual([
      { text: 'open 1' },
      { text: '♦', red: true },
      { text: '; with 3-3 open 1♣' },
    ])
    expect(splitRedSuits('no suits here')).toEqual([{ text: 'no suits here' }])
  })
})

describe('auction block', () => {
  it('parses dealer, flat calls, and notes; adapts to component props', () => {
    const body = ['dealer: N', '1C   P    1S   P', '1NT  P    2D^1  P', '2H', '---', '1. NMF'].join('\n')
    const block = parseAuctionBlock(body)
    expect(block.dealer).toBe('N')
    expect(block.calls).toEqual(['1C', 'P', '1S', 'P', '1NT', 'P', '2D^1', 'P', '2H'])
    expect(block.notes[1]).toBe('NMF')
    const props = toAuctionProps(block)
    expect(props.bids[6]).toBe('2D')
    expect(props.meanings).toEqual([{ position: 6, bid: '2D', meaning: 'NMF', note: 1 }])
  })

  it('keeps AP and rejects an illegal call', () => {
    expect(parseAuctionBlock('dealer: E\n1H 1S X 2S\n3H AP').calls).toContain('AP')
    expect(() => parseAuctionBlock('dealer: N\n1Z')).toThrow(/illegal call/)
  })
})

describe('response-box block', () => {
  it('parses title, rows, and note', () => {
    const box = parseResponseBox(['title: RKCB', '5C | 1 or 4', '5D | 0 or 3', '---', 'Note here'].join('\n'))
    expect(box.title).toBe('RKCB')
    expect(box.rows).toEqual([
      { left: '5C', right: '1 or 4' },
      { left: '5D', right: '0 or 3' },
    ])
    expect(box.note).toBe('Note here')
  })
})

describe('hands block', () => {
  it('parses seat holdings and layout', () => {
    const block = parseHandsBlock(['layout: NS', 'N: S:K T 6  H:J T 9 2  D:Q J  C:K 7 6 3', 'S: S:A Q  H:A 5  D:8 7 4 3  C:Q J T 9 5'].join('\n'))
    expect(block.layout).toBe('NS')
    expect(block.hands.N).toEqual({ spades: 'KT6', hearts: 'JT92', diamonds: 'QJ', clubs: 'K763' })
    expect(block.hands.S).toEqual({ spades: 'AQ', hearts: 'A5', diamonds: '8743', clubs: 'QJT95' })
  })
})

describe('front matter', () => {
  it('splits and parses the starter lesson front matter', () => {
    const { raw, data, body } = splitFrontMatter(STARTER_LESSON)
    expect(data?.title).toBe('New Minor Forcing')
    expect(data?.skill_paths).toEqual(['bidding_conventions/new_minor_forcing'])
    expect(data?.level).toBe('intermediate')
    expect(body.startsWith('\n# New Minor Forcing')).toBe(true)
    // raw is verbatim and re-joins losslessly
    expect(joinFrontMatter(raw, body)).toBe(STARTER_LESSON)
  })

  it('returns null data when there is no front matter', () => {
    const md = '# Just a heading\n\nSome text.'
    const { raw, data, body } = splitFrontMatter(md)
    expect(raw).toBeNull()
    expect(data).toBeNull()
    expect(body).toBe(md)
  })

  it('derives a lesson title from front matter, else first heading, else fallback', () => {
    expect(lessonTitle(STARTER_LESSON)).toBe('New Minor Forcing')
    expect(lessonTitle('# Just A Heading\n\ntext')).toBe('Just A Heading')
    expect(lessonTitle('no title anywhere')).toBe('Untitled lesson')
  })

  it('serializes front matter to a canonical ordered block', () => {
    const block = serializeFrontMatter({
      title: 'New Minor Forcing',
      skill_paths: ['bidding_conventions/new_minor_forcing'],
      primary: 'bidding_conventions/new_minor_forcing',
      level: 'intermediate',
      author: 'Rick',
      status: 'published',
      'reviewed-by': 'self',
    })
    // parses back to the same data, and omits empty optionals
    expect(splitFrontMatter(block).data).toMatchObject({ title: 'New Minor Forcing', level: 'intermediate' })
    expect(block.startsWith('---\ntitle: New Minor Forcing')).toBe(true)
    expect(serializeFrontMatter({ title: '' })).toBe('')
  })
})

describe('lesson validation', () => {
  it('passes a well-formed lesson', () => {
    expect(validateLesson(STARTER_LESSON)).toEqual([])
  })

  it('flags missing/invalid front matter and an unknown skill path', () => {
    const md = [
      '---',
      'title: X',
      'skill_paths:',
      '  - not_a/real_path',
      'level: wizard',
      'author: A',
      'status: live',
      'reviewed-by: self',
      '---',
      '',
      'body',
    ].join('\n')
    const messages = validateLesson(md).map((i) => i.message)
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('`level`'),
        expect.stringContaining('`status`'),
        expect.stringContaining('not in the taxonomy'),
      ]),
    )
  })

  it('flags an illegal block body', () => {
    const md = ['---', 'title: X', 'skill_paths:', '  - bidding_conventions/stayman', 'level: basic', 'author: A', 'status: draft', 'reviewed-by: self', '---', '', '```hand', 'S: A A', 'H: -', 'D: -', 'C: -', '```'].join('\n')
    expect(validateLesson(md).some((i) => /duplicate card/.test(i.message))).toBe(true)
  })

  it('validates nested blocks inside a row', () => {
    const md = ['---', 'title: X', 'skill_paths:', '  - bidding_conventions/stayman', 'level: basic', 'author: A', 'status: draft', 'reviewed-by: self', '---', '', '````row', '```auction', '1C P', '```', '````'].join('\n')
    // auction inside the row is missing its dealer
    expect(validateLesson(md).some((i) => /missing dealer/.test(i.message))).toBe(true)
  })
})

describe('reserved-block scan', () => {
  it('is the canonical reserved set', () => {
    expect(isReservedBlock('hand')).toBe(true)
    expect(isReservedBlock('deal')).toBe(true)
    expect(isReservedBlock('paragraph')).toBe(false)
  })

  it('finds the bridge blocks in the starter lesson', () => {
    const found = scanReservedBlocks(STARTER_LESSON)
    expect(found.map((b) => b.tag)).toEqual(['hand', 'auction', 'response-box'])
    const auction = found.find((b) => b.tag === 'auction')!
    expect(auction.body).toContain('dealer: N')
    expect(auction.body).toContain('New Minor Forcing')
  })
})
