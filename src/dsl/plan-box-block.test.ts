import { describe, it, expect } from 'vitest'
import { parsePlanBox, serializePlanBox } from './plan-box-block'

describe('parsePlanBox', () => {
  it('defaults to a blank winners worksheet', () => {
    expect(parsePlanBox('')).toEqual({
      table: 'winners',
      counting: true,
      techniques: true,
      counts: ['', '', '', ''],
      total: undefined,
      plan: ['', '', '', ''],
      labels: undefined,
    })
  })

  it('reads the pipe form, blanks and all', () => {
    const block = parsePlanBox('table: losers\ncounts: 1 | 2 | | 1\nplan: 2 | | ♦K |')
    expect(block.table).toBe('losers')
    expect(block.counts).toEqual(['1', '2', '', '1'])
    expect(block.plan).toEqual(['2', '', '♦K', ''])
    expect(block.total).toBeUndefined()
  })

  it('reads the key form, matching technique columns by name', () => {
    const block = parsePlanBox('table: winners\nS: 2\nH: 1\nD: 3\nC: 1\nEnd-Play: yes\npromotion: 2')
    expect(block.counts).toEqual(['2', '1', '3', '1'])
    // "End-Play", "end play" and "endplay" all name the fourth column.
    expect(block.plan).toEqual(['2', '', '', 'yes'])
  })

  it('takes a total from either form, and only when authored', () => {
    expect(parsePlanBox('counts: 2 | 1 | 3 | 1 | 7').total).toBe('7')
    expect(parsePlanBox('counts: 2 | 1 | 3 | 1').total).toBeUndefined()
    expect(parsePlanBox('total: 7+').total).toBe('7+')
  })

  it('honours the section flags and a labels override', () => {
    const block = parsePlanBox('counting: off\nlabels: Ruff, Discard\nplan: 1 | 2')
    expect(block.counting).toBe(false)
    expect(block.techniques).toBe(true)
    expect(block.labels).toEqual(['Ruff', 'Discard'])
    // The override sets the column count, so `plan` is two cells, not four.
    expect(block.plan).toEqual(['1', '2'])
  })

  it('rejects a body that would render nothing, or an over-long row', () => {
    expect(() => parsePlanBox('counting: off\ntechniques: off')).toThrow(/nothing to show/)
    expect(() => parsePlanBox('counts: 1 | 2 | 3 | 4 | 10 | 1')).toThrow(/at most five cells/)
    expect(() => parsePlanBox('plan: 1 | 2 | 3 | 4 | 5')).toThrow(/at most 4 cells/)
  })

  it('rejects an unknown table, flag value, or line', () => {
    expect(() => parsePlanBox('table: tricks')).toThrow(/winners or losers/)
    expect(() => parsePlanBox('counting: maybe')).toThrow(/must be on or off/)
    expect(() => parsePlanBox('ruffs: 2')).toThrow(/unrecognized/) // a losers column, on a winners box
    expect(() => parsePlanBox('no colon here')).toThrow(/unrecognized/)
  })
})

describe('serializePlanBox', () => {
  it('round-trips the canonical form and is idempotent', () => {
    const canonical = 'table: losers\ncounts: 1 | 2 |  | 1\nplan: 2 |  | ♦K'
    expect(serializePlanBox(parsePlanBox(canonical))).toBe(canonical)
  })

  it('normalizes the key form to pipe rows, dropping defaults', () => {
    const messy = 'C: 1\nD: 3\nS: 2\nH: 1\ntable: winners\nfinesse: ♠Q'
    const once = serializePlanBox(parsePlanBox(messy))
    expect(once).toBe('table: winners\ncounts: 2 | 1 | 3 | 1\nplan:  |  | ♠Q')
    expect(serializePlanBox(parsePlanBox(once))).toBe(once)
  })

  it('keeps an authored total positioned even when the suit cells are blank', () => {
    const once = serializePlanBox(parsePlanBox('total: 7'))
    expect(once).toBe('table: winners\ncounts:  |  |  |  | 7')
    expect(parsePlanBox(once).total).toBe('7')
  })
})
