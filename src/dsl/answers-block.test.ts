import { describe, it, expect } from 'vitest'
import { parseAnswersBlock } from './answers-block'

describe('parseAnswersBlock', () => {
  it('defaults to no columns for an empty body', () => {
    expect(parseAnswersBlock('')).toEqual({})
    expect(parseAnswersBlock('   \n  ')).toEqual({})
  })

  it('reads a columns setting', () => {
    expect(parseAnswersBlock('columns: 2')).toEqual({ columns: 2 })
  })

  it('rejects out-of-range columns and unknown lines', () => {
    expect(() => parseAnswersBlock('columns: 9')).toThrow(/between 1 and 4/)
    expect(() => parseAnswersBlock('bogus: 1')).toThrow(/unrecognized/)
  })
})
