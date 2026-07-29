import { describe, it, expect } from 'vitest'
import { parseQuizBlock, serializeQuizBlock, buildQuizEmbed, collectQuizAnswers, type QuizEmbed } from './quiz-block'
import { quizAnswersMode, serializeFrontMatter } from './front-matter'
import { splitFrontMatter } from './front-matter'

// A valid embed built from the real 1C_WalshStyle exercise (Contract 3).
const VALID: QuizEmbed = {
  schema: 'quiz-embed/v1',
  source: { lesson_id: '1C_WalshStyle', title: 'Walsh Style', generated: '2026-07-26', pipeline_version: '1.0.0' },
  exercise: {
    id: '1C_WalshStyle-1',
    type: 'bidding',
    title: 'Exercise One — Responding to 1♣',
    prompt: 'Partner opens 1♣. What do you bid with each of these hands?',
    questions: [
      {
        hand: { spades: '754', hearts: 'K874', diamonds: 'AK65', clubs: 'A2' },
        seat: 'S',
        dealer: 'N',
        vulnerability: 'None',
        context: { dealer: 'N', calls: ['1C', 'P'] },
        answer: '1D',
        board: { repo: 'Practice-Bidding-Scenarios', id: '000B6835D55DDDE2A07889A2F0DF', event: '1C_WalshStyle', board: 1 },
      },
      {
        hand: { spades: 'T53', hearts: 'AQ96', diamonds: 'AK72', clubs: 'Q9' },
        seat: 'S',
        context: { dealer: 'N', calls: ['1C', 'P'] },
        answer: '1D',
        alternates: ['1H'],
      },
    ],
  },
}

const body = (o: unknown) => JSON.stringify(o)

describe('quiz-block parse/serialize (quiz-embed/v1)', () => {
  it('parses a valid embed and round-trips through serialize', () => {
    const parsed = parseQuizBlock(serializeQuizBlock(VALID))
    expect(parsed).toEqual(VALID)
  })

  it('accepts a question with no context (an opening-bid problem)', () => {
    const opening = structuredClone(VALID)
    delete opening.exercise.questions[0].context
    expect(() => parseQuizBlock(body(opening))).not.toThrow()
  })

  it('rejects the old flat quiz/v1 shape', () => {
    expect(() => parseQuizBlock(body({ schema: 'quiz/v1', type: 'bidding', items: [] }))).toThrow(/quiz-embed\/v1/)
  })

  it('requires source.lesson_id', () => {
    const bad = structuredClone(VALID) as Record<string, any>
    delete bad.source.lesson_id
    expect(() => parseQuizBlock(body(bad))).toThrow(/lesson_id/)
  })

  it('requires exercise.type "bidding"', () => {
    const bad = structuredClone(VALID)
    ;(bad.exercise as any).type = 'lead'
    expect(() => parseQuizBlock(body(bad))).toThrow(/bidding/)
  })

  it('rejects a non-empty-but-invalid answer', () => {
    const bad = structuredClone(VALID)
    bad.exercise.questions[0].answer = '1X' as any
    expect(() => parseQuizBlock(body(bad))).toThrow(/answer/)
  })

  it('rejects a bad hand holding', () => {
    const bad = structuredClone(VALID)
    bad.exercise.questions[0].hand.spades = '75X'
    expect(() => parseQuizBlock(body(bad))).toThrow(/spades/)
  })

  it('rejects an empty questions array', () => {
    const bad = structuredClone(VALID)
    bad.exercise.questions = []
    expect(() => parseQuizBlock(body(bad))).toThrow(/non-empty/)
  })

  it('rejects invalid JSON', () => {
    expect(() => parseQuizBlock('{not json')).toThrow(/invalid JSON/)
  })
})

describe('collectQuizAnswers (Q4 answer section)', () => {
  const fence = (embed: unknown) => '```quiz\n' + JSON.stringify(embed) + '\n```'
  const md = [
    '---\ntitle: T\n---',
    'Some prose.',
    fence(VALID),
    'More prose.',
    fence({ ...VALID, exercise: { ...VALID.exercise, prompt: 'Second prompt.', questions: [VALID.exercise.questions[0]] } }),
    '```quiz\n{ not valid json\n```', // skipped, never throws
  ].join('\n\n')

  it('collects each quiz block in document order, grouped by prompt, numbered N', () => {
    const groups = collectQuizAnswers(md)
    expect(groups.map((g) => g.exercise)).toEqual([1, 2]) // 1-based, document order
    expect(groups.map((g) => g.prompt)).toEqual([
      'Partner opens 1♣. What do you bid with each of these hands?',
      'Second prompt.',
    ])
    expect(groups[0].answers.map((a) => a.answer)).toEqual(['1D', '1D'])
    expect(groups[0].answers[1].alternates).toEqual(['1H'])
    expect(groups[1].answers).toHaveLength(1)
  })

  it('returns nothing for a lesson with no quiz blocks', () => {
    expect(collectQuizAnswers('---\ntitle: T\n---\n\nJust prose.')).toEqual([])
  })
})

describe('quizAnswersMode', () => {
  it('defaults to end, and honors inline/none', () => {
    expect(quizAnswersMode(null)).toBe('end')
    expect(quizAnswersMode({})).toBe('end')
    expect(quizAnswersMode({ 'quiz-answers': 'inline' })).toBe('inline')
    expect(quizAnswersMode({ 'quiz-answers': 'none' })).toBe('none')
    expect(quizAnswersMode({ 'quiz-answers': 'bogus' as never })).toBe('end')
  })

  it('serializeFrontMatter preserves a non-default quiz-answers and omits the default', () => {
    const base = { title: 'T', level: 'intermediate' as const, author: 'A', status: 'draft' as const, 'reviewed-by': 'self', skill_paths: ['x'] }
    expect(serializeFrontMatter({ ...base, 'quiz-answers': 'inline' })).toContain('quiz-answers: inline')
    expect(serializeFrontMatter({ ...base, 'quiz-answers': 'end' })).not.toContain('quiz-answers')
    // round-trips through split → serialize
    const md = serializeFrontMatter({ ...base, 'quiz-answers': 'none' })
    expect(quizAnswersMode(splitFrontMatter(md).data)).toBe('none')
  })
})

describe('buildQuizEmbed', () => {
  it('embeds a chosen subset of questions', () => {
    const embed = buildQuizEmbed(VALID.source, VALID.exercise, [VALID.exercise.questions[1]])
    expect(embed.schema).toBe('quiz-embed/v1')
    expect(embed.exercise.questions).toHaveLength(1)
    expect(embed.exercise.questions[0].hand.spades).toBe('T53')
    // still valid after serialization
    expect(() => parseQuizBlock(serializeQuizBlock(embed))).not.toThrow()
  })
})
