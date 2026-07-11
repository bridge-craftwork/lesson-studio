import { describe, it, expect } from 'vitest'
import { normalizeHolding, normalizeHand, handHcp, cardCount, toComponentHand } from './hand'
import { isCall, stripAnnotationMarker, annotationIndex } from './call'
import { scanReservedBlocks } from './scan'
import { isReservedBlock } from './types'
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
