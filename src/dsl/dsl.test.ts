import { describe, it, expect } from 'vitest'
import { normalizeHolding, normalizeHand, handHcp, cardCount, toComponentHand } from './hand'
import { isCall, stripAnnotationMarker, annotationIndex } from './call'
import { scanReservedBlocks } from './scan'
import { isReservedBlock, RESERVED_BLOCKS } from './types'
import { blockSchema, completions } from './schema'
import { pbnHolding, pbnDeal, pbnGame } from './pbn'
import { resolveDealLinks, auctionsByDeal } from './deal-link'
import { parseHandBlock, serializeHandBlock } from './hand-block'
import { parseRowBlock } from './row-block'
import { validateLesson } from './validate'
import { parseAuctionBlock, toAuctionProps } from './auction-block'
import { parseResponseBox } from './response-box-block'
import { parseHandsBlock } from './hands-block'
import { formatCall, callSegments, bidTextSegments } from './call'
import { splitRedSuits } from './suits'
import { splitFrontMatter, joinFrontMatter, lessonTitle, serializeFrontMatter, printTypography } from './front-matter'
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

  it('renders compound bid notation with glyphs (2/3H)', () => {
    // levels stay black, only the strain becomes a (red) glyph
    expect(bidTextSegments('2/3H')).toEqual([{ text: '2/3' }, { text: '♥', red: true }])
    expect(bidTextSegments('2/3S')).toEqual([{ text: '2/3' }, { text: '♠', red: false }])
    expect(bidTextSegments('2/3NT')).toEqual([{ text: '2/3' }, { text: 'NT' }])
    expect(bidTextSegments('3D')).toEqual([{ text: '3' }, { text: '♦', red: true }])
  })

  it('leaves non-bid text alone', () => {
    expect(bidTextSegments('Jump')).toEqual([{ text: 'Jump' }])
    expect(bidTextSegments('5 Clubs')).toEqual([{ text: '5 Clubs' }])
    expect(bidTextSegments('After 1st round')).toEqual([{ text: 'After 1st round' }])
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

  it('accepts PBN =n= annotations (detached and attached) and legacy ^n', () => {
    const pbn = parseAuctionBlock('dealer: N\n1C P 1S P\n1NT P 2D =1= P\n---\n1. NMF')
    expect(toAuctionProps(pbn).meanings).toEqual([
      { position: 6, bid: '2D', meaning: 'NMF', note: 1 },
    ])
    // attached form and the legacy caret resolve identically
    expect(toAuctionProps(parseAuctionBlock('dealer: N\n1C=1=\n---\n1. x')).meanings[0].note).toBe(1)
    expect(toAuctionProps(parseAuctionBlock('dealer: N\n1C^1\n---\n1. x')).meanings[0].note).toBe(1)
    expect(() => parseAuctionBlock('dealer: N\n=1= 1C')).toThrow(/precedes any call/)
  })

  it('keeps AP and rejects an illegal call', () => {
    expect(parseAuctionBlock('dealer: E\n1H 1S X 2S\n3H AP').calls).toContain('AP')
    expect(() => parseAuctionBlock('dealer: N\n1Z')).toThrow(/illegal call/)
  })

  it('accepts a bare `!` alert, with or without a note', () => {
    // A bare alert earns a meanings entry with no text — the component needs
    // one to mark the cell, but it contributes no footnote line.
    const bare = toAuctionProps(parseAuctionBlock('dealer: N\n1C P 1S P\n1NT P 2D! P'))
    expect(bare.bids[6]).toBe('2D')
    expect(bare.meanings).toEqual([{ position: 6, bid: '2D', isAlert: true }])

    // `!` combines with a note and precedes it.
    const both = toAuctionProps(parseAuctionBlock('dealer: N\n2D! =1=\n---\n1. NMF'))
    expect(both.bids).toEqual(['2D'])
    expect(both.meanings).toEqual([
      { position: 0, bid: '2D', meaning: 'NMF', note: 1, isAlert: true },
    ])
  })

  it('parses the display keys and defaults them', () => {
    const plain = parseAuctionBlock('dealer: N\n1C P')
    expect(plain).toMatchObject({ columns: 4, labels: undefined, grid: true })

    const styled = parseAuctionBlock(
      ['dealer: N', 'columns: 2', 'labels: Opener, Responder', 'grid: off', '1C P'].join('\n')
    )
    expect(styled).toMatchObject({
      columns: 2,
      labels: ['Opener', 'Responder'],
      grid: false,
    })
    // and they reach the component props
    expect(toAuctionProps(styled)).toMatchObject({
      columns: 2,
      labels: ['Opener', 'Responder'],
      grid: false,
    })
  })

  it('rejects malformed display keys', () => {
    expect(() => parseAuctionBlock('dealer: N\ncolumns: 3\n1C')).toThrow(/illegal columns/)
    expect(() => parseAuctionBlock('dealer: N\ngrid: maybe\n1C')).toThrow(/illegal grid/)
    expect(() => parseAuctionBlock('dealer: N\nlabels: Opener\n1C')).toThrow(/exactly two/)
  })
})

describe('print typography', () => {
  it('defaults to the house style when nothing is authored', () => {
    // 12pt is deliberately larger than a typical handout: this material is
    // read by seniors.
    expect(printTypography(null)).toEqual({
      columns: 2,
      fontSizePt: 12,
      textScale: 1,
      effectivePt: 12,
    })
  })

  it('multiplies the nudge into the authored base', () => {
    expect(printTypography({ 'font-size': 14, 'text-scale': 0.95 })).toMatchObject({
      fontSizePt: 14,
      textScale: 0.95,
      effectivePt: 13.3,
    })
  })

  it('rounds the effective size, so a measurement is reproducible', () => {
    // 11 * 0.93 = 10.229999… — raw, that lands in a CSS length and makes
    // page measurements jitter.
    expect(printTypography({ 'font-size': 11, 'text-scale': 0.93 }).effectivePt).toBe(10.23)
  })

  it('falls back on nonsense rather than rendering at zero', () => {
    expect(printTypography({ 'font-size': 0, 'text-scale': -1 })).toMatchObject({
      fontSizePt: 12,
      textScale: 1,
    })
  })

  it('omits defaults when serializing, and keeps what was set', () => {
    const base = {
      title: 'T',
      skill_paths: ['bidding_conventions/stayman'],
      level: 'basic' as const,
      author: 'A',
      status: 'draft' as const,
      'reviewed-by': 'self',
    }
    const plain = serializeFrontMatter({ ...base, 'font-size': 12, 'text-scale': 1 })
    expect(plain).not.toContain('font-size')
    expect(plain).not.toContain('text-scale')

    const sized = serializeFrontMatter({ ...base, 'font-size': 14, 'text-scale': 0.95 })
    expect(sized).toContain('font-size: 14')
    expect(sized).toContain('text-scale: 0.95')
    // and it parses back to what was written
    expect(splitFrontMatter(sized).data).toMatchObject({ 'font-size': 14, 'text-scale': 0.95 })
  })
})

describe('auction-to-hand pairing', () => {
  const HAND = (id?: string) =>
    [id ? `id: ${id}` : 'seat: S', 'S: A Q 9 5 4', 'H: K 7 3', 'D: A 5', 'C: J 8 4']
      .filter(Boolean)
      .join('\n')
  const AUCTION = (deal?: string) => ['dealer: N', deal ? `deal: ${deal}` : '', '1C P'].filter(Boolean).join('\n')

  const doc = (...specs: [string, string][]) =>
    specs.map(([kind, body], index) => ({ index, kind, body }))

  it('pairs an auction with the nearest preceding hand, with no annotation', () => {
    const { links, errors } = resolveDealLinks(
      doc(['hand', HAND()], ['auction', AUCTION()], ['hand', HAND()], ['auction', AUCTION()])
    )
    expect(errors).toEqual([])
    expect(links).toEqual([
      { auction: 1, deal: 0, explicit: false },
      { auction: 3, deal: 2, explicit: false },
    ])
  })

  it('leaves an auction with no preceding hand unpaired, not in error', () => {
    // The opening illustration in New Minor Forcing is exactly this shape.
    const { links, errors } = resolveDealLinks(doc(['auction', AUCTION()], ['hand', HAND()]))
    expect(errors).toEqual([])
    expect(links).toEqual([{ auction: 0, deal: null, explicit: false }])
  })

  it('follows an explicit id, including one declared later in the lesson', () => {
    const { links, errors } = resolveDealLinks(
      doc(['hand', HAND()], ['auction', AUCTION('slam')], ['hand', HAND('slam')])
    )
    expect(errors).toEqual([])
    // Not the nearest preceding hand (0) — the named one.
    expect(links).toEqual([{ auction: 1, deal: 2, explicit: true }])
  })

  it('lets `deal: none` opt out of the default pairing', () => {
    const { links } = resolveDealLinks(doc(['hand', HAND()], ['auction', AUCTION('none')]))
    expect(links).toEqual([{ auction: 1, deal: null, explicit: true }])
  })

  it('reports an unknown id and a duplicate id, without throwing', () => {
    expect(resolveDealLinks(doc(['auction', AUCTION('nope')])).errors).toEqual([
      'auction references unknown hand id "nope"',
    ])
    expect(
      resolveDealLinks(doc(['hand', HAND('x')], ['hands', 'id: x\nN: S:A\nS: S:K'])).errors
    ).toEqual(['duplicate hand id "x"'])
  })

  it('groups auctions by the deal they are bid on', () => {
    const { links } = resolveDealLinks(
      doc(['hand', HAND()], ['auction', AUCTION()], ['auction', AUCTION()])
    )
    expect(auctionsByDeal(links)).toEqual(new Map([[0, [1, 2]]]))
  })

  it('is caught by the lint when an id does not resolve', () => {
    const md = [
      '---',
      'title: X',
      'skill_paths:',
      '  - bidding_conventions/stayman',
      'primary: bidding_conventions/stayman',
      'level: basic',
      'author: A',
      'status: draft',
      'reviewed-by: self',
      '---',
      '',
      '```auction',
      'dealer: N',
      'deal: missing',
      '1C P',
      '```',
    ].join('\n')
    expect(validateLesson(md).map((i) => i.message)).toContain(
      '`auction` block: auction references unknown hand id "missing"'
    )
  })
})

describe('PBN emission', () => {
  const SOUTH = parseHandBlock('seat: S\nS: A Q 9 5 4\nH: K 7 3\nD: A 5\nC: J 8 4')

  it('writes a holding with dots, and a void as empty', () => {
    expect(pbnHolding(SOUTH.hand)).toBe('AQ954.K73.A5.J84')
    expect(pbnHolding(parseHandBlock('S: A K\nH: -\nD: 2\nC: 3').hand)).toBe('AK..2.3')
  })

  it('marks the hands a lesson does not give as unknown, never invented', () => {
    // Lesson hands are usually one seat; PBN writes the rest as `-`.
    expect(pbnDeal({ S: SOUTH.hand })).toBe('S:AQ954.K73.A5.J84 - - -')
  })

  it('lists hands clockwise from the tagged seat', () => {
    const { hands } = parseHandsBlock(
      ['N: S:K T 6  H:J T 9 2  D:Q J  C:K 7 6 3', 'S: S:A Q  H:A 5  D:8 7 4 3  C:Q J T 9 5'].join('\n')
    )
    // Tagged N, so the order is N E S W — the given S lands third, not second.
    expect(pbnDeal(hands)).toBe('N:KT6.JT92.QJ.K763 - AQ.A5.8743.QJT95 -')
  })

  it('returns null when there are no hands at all', () => {
    expect(pbnDeal({})).toBeNull()
    expect(pbnGame({})).toBeNull()
  })

  it('emits the mandatory tag set, and the auction when a dealer is known', () => {
    const game = pbnGame({ S: SOUTH.hand }, {
      event: 'New Minor Forcing',
      board: 3,
      dealer: 'N',
      auction: ['1C', 'P', '1S', 'P', '1NT'],
    })!
    expect(game).toContain('[Event "New Minor Forcing"]')
    expect(game).toContain('[Board "3"]')
    expect(game).toContain('[Dealer "N"]')
    expect(game).toContain('[Deal "S:AQ954.K73.A5.J84 - - -"]')
    for (const tag of ['Site', 'Date', 'West', 'Vulnerable', 'Scoring', 'Contract', 'Result']) {
      expect(game, tag).toContain(`[${tag} "`)
    }
    // The auction section is written in rounds of four from the dealer.
    expect(game).toContain('[Auction "N"]\n1C P 1S P\n1NT')
  })

  it('escapes quotes in a tag value rather than breaking the record', () => {
    expect(pbnGame({ S: SOUTH.hand }, { event: 'The "Big" Club' })).toContain(
      '[Event "The \\"Big\\" Club"]'
    )
  })
})

describe('block key schema', () => {
  it('describes every key the auction parser accepts', () => {
    const names = blockSchema('auction')!.keys.map((k) => k.name)
    expect(names).toEqual(['dealer', 'columns', 'labels', 'grid', 'deal'])
  })

  it('covers every reserved block, and each example parses', () => {
    for (const tag of RESERVED_BLOCKS) expect(blockSchema(tag), tag).toBeDefined()
    // The examples are offered as starting points, so they must actually load.
    expect(() => parseAuctionBlock(blockSchema('auction')!.example)).not.toThrow()
    expect(() => parseHandBlock(blockSchema('hand')!.example)).not.toThrow()
    expect(() => parseHandsBlock(blockSchema('hands')!.example)).not.toThrow()
    expect(() => parseResponseBox(blockSchema('response-box')!.example)).not.toThrow()
  })

  it('completes on a prefix, and offers everything on an empty one', () => {
    expect(completions('auction', 'co').map((k) => k.name)).toEqual(['columns'])
    expect(completions('auction', '').map((k) => k.name)).toEqual([
      'dealer',
      'columns',
      'labels',
      'grid',
      'deal',
    ])
    // prefix, not substring — `l` must not drag in `dealer`/`columns`
    expect(completions('auction', 'l').map((k) => k.name)).toEqual(['labels'])
    // `deal` is a prefix of `dealer`, so both are offered and neither is hidden
    expect(completions('auction', 'deal').map((k) => k.name)).toEqual(['dealer', 'deal'])
    expect(completions('auction', 'zz')).toEqual([])
    expect(completions('not-a-block', '')).toEqual([])
  })

  it('excludes body-line patterns, which are not completable keys', () => {
    // `hand` describes `S / H / D / C` as a body pattern, not a literal key.
    expect(completions('hand', '').map((k) => k.name)).toEqual(['seat', 'label', 'id', 'marks'])
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
