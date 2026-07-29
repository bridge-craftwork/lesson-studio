import { describe, it, expect } from 'vitest'
import { parseQuizLesson, quizSourceFromLesson, questionCount, parseQuizManifest } from './quiz-lesson'
import { buildQuizEmbed, parseQuizBlock, serializeQuizBlock } from './quiz-block'

// A trimmed but real-shaped quiz-lesson/v1 (from 1C_WalshStyle).
const LESSON = {
  schema: 'quiz-lesson/v1',
  id: '1C_WalshStyle',
  title: 'Walsh Style',
  provenance: {
    source: 'Practice-Bidding-Scenarios',
    pipeline_version: '1.0.0',
    generated: '2026-07-26',
    source_quiz: '1C_WalshStyle',
  },
  exercises: [
    {
      id: '1C_WalshStyle-1',
      type: 'bidding',
      title: 'Exercise One — Responding to 1♣',
      prompt: 'Partner opens 1♣. What do you bid with each of these hands?',
      questions: [
        { hand: { spades: '754', hearts: 'K874', diamonds: 'AK65', clubs: 'A2' }, seat: 'S', context: { dealer: 'N', calls: ['1C', 'P'] }, answer: '1D' },
        { hand: { spades: 'T53', hearts: 'AQ96', diamonds: 'AK72', clubs: 'Q9' }, seat: 'S', context: { dealer: 'N', calls: ['1C', 'P'] }, answer: '1D' },
      ],
    },
    {
      id: '1C_WalshStyle-2',
      type: 'bidding',
      title: 'Exercise Two — Opener rebid',
      prompt: 'You open 1♣, partner responds 1♦. What do you bid?',
      questions: [
        { hand: { spades: 'Q98', hearts: 'K73', diamonds: 'Q63', clubs: 'AK86' }, seat: 'N', context: { dealer: 'N', calls: ['1C', 'P', '1D', 'P'] }, answer: '1NT' },
      ],
    },
  ],
}

describe('parseQuizLesson (quiz-lesson/v1)', () => {
  it('parses a valid lesson and counts questions', () => {
    const lesson = parseQuizLesson(JSON.stringify(LESSON))
    expect(lesson.exercises).toHaveLength(2)
    expect(questionCount(lesson)).toBe(3)
  })

  it('rejects a non-quiz-lesson JSON', () => {
    expect(() => parseQuizLesson(JSON.stringify({ schema: 'quiz-embed/v1' }))).toThrow(/not a quiz lesson/)
  })

  it('rejects an exercise with a bad question', () => {
    const bad = structuredClone(LESSON)
    bad.exercises[0].questions[0].answer = 'nope'
    expect(() => parseQuizLesson(JSON.stringify(bad))).toThrow(/answer/)
  })

  it('maps provenance into a quiz-embed source', () => {
    const lesson = parseQuizLesson(JSON.stringify(LESSON))
    expect(quizSourceFromLesson(lesson)).toEqual({
      lesson_id: '1C_WalshStyle',
      title: 'Walsh Style',
      generated: '2026-07-26',
      pipeline_version: '1.0.0',
    })
  })

  it('parses the quiz-index/v1 manifest, tolerating extra keys and defaulting title', () => {
    const manifest = parseQuizManifest(
      JSON.stringify({
        schema: 'quiz-index/v1',
        generated: '2026-07-26',
        pipeline_version: '1.0.0',
        lessons: [
          { id: '1C_WalshStyle', title: 'Walsh Style', exercise_count: 4, question_count: 24, file: '1C_WalshStyle.json' },
          { id: 'No_Title', file: 'No_Title.json' }, // title defaults to id
          { junk: true }, // no id/file → dropped
        ],
      }),
    )
    expect(manifest.lessons.map((l) => l.id)).toEqual(['1C_WalshStyle', 'No_Title'])
    expect(manifest.lessons[1].title).toBe('No_Title')
    expect(manifest.lessons[0].question_count).toBe(24)
  })

  it('rejects a non-manifest JSON', () => {
    expect(() => parseQuizManifest(JSON.stringify({ schema: 'quiz-lesson/v1' }))).toThrow(/not a quiz manifest/)
  })

  it('builds a valid quiz block from a picked exercise + subset (the picker path)', () => {
    const lesson = parseQuizLesson(JSON.stringify(LESSON))
    const ex = lesson.exercises[0]
    const embed = buildQuizEmbed(quizSourceFromLesson(lesson), ex, [ex.questions[1]])
    const body = serializeQuizBlock(embed)
    const parsed = parseQuizBlock(body) // survives the full round-trip
    expect(parsed.exercise.questions).toHaveLength(1)
    expect(parsed.exercise.questions[0].hand.spades).toBe('T53')
    expect(parsed.source.lesson_id).toBe('1C_WalshStyle')
  })
})
