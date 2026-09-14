import { describe, expect, it } from 'vitest'
import { parseTable, resolveTableAlign } from './table-block'
import { parseCellText } from './cell-text'

describe('parseTable', () => {
  it('parses title, header, rows and note', () => {
    const t = parseTable(
      ['title: Choose the suit', 'header: # | NT | Lead | Suit', '1 | [x] | Partner’s suit | [x]', '---', 'A note.'].join('\n')
    )
    expect(t.title).toBe('Choose the suit')
    expect(t.header).toEqual(['#', 'NT', 'Lead', 'Suit'])
    expect(t.rows).toEqual([['1', '[x]', 'Partner’s suit', '[x]']])
    expect(t.notes).toEqual(['A note.'])
  })

  it('reads several footer notes, keeping line breaks and skipping empty sections', () => {
    const t = parseTable(
      ['a | b', '---', 'First note.', '---', '---', 'Second, line one', '  line two  '].join('\n')
    )
    expect(t.notes).toEqual(['First note.', 'Second, line one\nline two'])
    expect(parseTable('a | b').notes).toEqual([])
  })

  it('treats a leading pipe as a blank first cell and pads short rows', () => {
    const t = parseTable(['header: a | b | c', '| x', 'p | q | r'].join('\n'))
    expect(t.rows).toEqual([
      ['', 'x', ''],
      ['p', 'q', 'r'],
    ])
  })

  it('needs no title or header', () => {
    const t = parseTable('a | b\nc | d')
    expect(t.title).toBeUndefined()
    expect(t.header).toBeUndefined()
    expect(t.rows).toHaveLength(2)
  })

  it('rejects a row wider than the header, a row with no pipe, and no rows', () => {
    expect(() => parseTable('header: a | b\n1 | 2 | 3')).toThrow(/3 cells/)
    expect(() => parseTable('title: T\njust text')).toThrow(/missing "\|"/)
    expect(() => parseTable('title: T')).toThrow(/no rows/)
  })

  it('auto-centres marker columns, and an authored align wins', () => {
    const t = parseTable(['header: # | NT | Lead', '1 | [x] | Partner', '2 | [ ] | Unbid'].join('\n'))
    expect(resolveTableAlign(t)).toEqual(['center', 'center', 'left'])
    const u = parseTable(['align: l | | r', '1 | [x] | Partner'].join('\n'))
    expect(resolveTableAlign(u)).toEqual(['left', 'center', 'right'])
    expect(() => parseTable('align: middle\na | b')).toThrow(/left, center or right/)
  })
})

describe('parseCellText', () => {
  it('reads whole-cell checkboxes', () => {
    expect(parseCellText('[x]')).toEqual([{ kind: 'check', checked: true }])
    expect(parseCellText(' ✓ ')).toEqual([{ kind: 'check', checked: true }])
    expect(parseCellText('[ ]')).toEqual([{ kind: 'check', checked: false }])
  })

  it('reads holdings with a highlighted card, among text', () => {
    expect(parseCellText('D:[K]Q62, S:K[J]T')).toEqual([
      {
        kind: 'holding',
        suit: 'D',
        cards: [{ rank: 'K', highlight: true }, { rank: 'Q' }, { rank: '6' }, { rank: '2' }],
      },
      { kind: 'text', text: ', ' },
      {
        kind: 'holding',
        suit: 'S',
        cards: [{ rank: 'K' }, { rank: 'J', highlight: true }, { rank: '10' }],
      },
    ])
  })

  it('accepts 10 and small cards', () => {
    expect(parseCellText('C:J[10]8X')).toEqual([
      {
        kind: 'holding',
        suit: 'C',
        cards: [{ rank: 'J' }, { rank: '10', highlight: true }, { rank: '8' }, { rank: 'x' }],
      },
    ])
  })

  it('leaves prose that only looks like a holding alone', () => {
    expect(parseCellText('ABC:K and S:Ace')).toEqual([{ kind: 'text', text: 'ABC:K and S:Ace' }])
  })

  it('colours red glyphs in the surrounding text', () => {
    expect(parseCellText('lead a ♥')).toEqual([
      { kind: 'text', text: 'lead a ' },
      { kind: 'text', text: '♥', red: true },
    ])
  })
})
