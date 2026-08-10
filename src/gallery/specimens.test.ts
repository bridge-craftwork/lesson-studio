import { describe, it, expect } from 'vitest'
import { validateBlockBody, RESERVED_BLOCKS, blockSchema } from '@/dsl'
import { GALLERY } from './specimens'

/**
 * The gallery specimens and the schema examples are fixed block bodies that only
 * ever ran in a browser — so when a block's shape moved under them (the `quiz`
 * body becoming the `quiz-embed/v1` envelope) they failed as a red box on the
 * published gallery instead of as a red test. Lint them here.
 */
describe('fixed block bodies', () => {
  for (const group of GALLERY) {
    for (const specimen of group.specimens) {
      it(`gallery ${group.tag} — ${specimen.label} parses`, () => {
        expect(validateBlockBody(group.tag, specimen.body)).toEqual([])
      })
    }
  }

  for (const tag of RESERVED_BLOCKS) {
    it(`${tag} schema example parses (the ribbon inserts it)`, () => {
      expect(validateBlockBody(tag, blockSchema(tag)!.example)).toEqual([])
    })
  }
})
