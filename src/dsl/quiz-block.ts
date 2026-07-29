/**
 * Contract 1 `quiz` block body — `quiz-embed/v1`.
 *
 * A quiz block embeds **one exercise, by value**: its shared `prompt` and the
 * questions an author picked under it, copied verbatim from a Practice-Bidding-
 * Scenarios `quiz-lesson/v1` file (Contract 3), wrapped with just enough
 * `source` provenance to detect a stale snapshot. Embedding by value keeps the
 * lesson reconstructable from the `.md` alone; `source.lesson_id` +
 * `source.generated` let tooling flag a snapshot that lags current PBS output.
 *
 * The question shape mirrors Contract 3's `bidding` question (hand, seat,
 * context auction, answer, board), so a picked question needs no transform.
 * This supersedes the Phase-1 flat `quiz/v1` placeholder.
 */
import type { Hand, Seat, Call } from './types'
import { CALL_RE } from './call'
import { scanReservedBlocks } from './scan'

export type Vulnerability = 'None' | 'NS' | 'EW' | 'Both'
const SEATS = ['N', 'E', 'S', 'W']
const VULNS: Vulnerability[] = ['None', 'NS', 'EW', 'Both']
const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const
const RANKS_RE = /^[AKQJT2-9]*$/

/** Per-question deal provenance (Contract 3 BoardRef). */
export interface QuizBoardRef {
  repo: 'Practice-Bidding-Scenarios'
  id: string
  event?: string
  board?: number
}

/** The calls made before it is the quizzed seat's turn (dealer-first). */
export interface QuizContext {
  dealer?: Seat
  calls: Call[]
}

/** One bidding problem: a hand, the auction it faces, and the expected call. */
export interface BiddingQuestion {
  hand: Hand
  seat?: Seat
  dealer?: Seat
  vulnerability?: Vulnerability
  context?: QuizContext
  answer: Call
  alternates?: Call[]
  explanation?: string
  board?: QuizBoardRef
}

/** A shared prompt over a group of questions (Contract 3 exercise, `bidding`). */
export interface QuizExercise {
  id: string
  type: 'bidding'
  title: string
  prompt: string
  questions: BiddingQuestion[]
}

/** Where the embedded exercise came from — for staleness detection. */
export interface QuizSource {
  /** The PBS scenario stem the exercise was picked from. */
  lesson_id: string
  /** Human title of the source lesson (optional, for display). */
  title?: string
  /** ISO date the source lesson was generated. */
  generated?: string
  /** PBS pipeline version that emitted the source. */
  pipeline_version?: string
}

/** The `quiz` block body. */
export interface QuizEmbed {
  schema: 'quiz-embed/v1'
  source: QuizSource
  exercise: QuizExercise
}

function fail(msg: string): never {
  throw new Error(msg)
}

function validateHand(h: unknown, at: string): void {
  if (!h || typeof h !== 'object') fail(`${at}: missing hand`)
  const hand = h as Record<string, unknown>
  for (const s of SUITS) {
    if (typeof hand[s] !== 'string' || !RANKS_RE.test(hand[s] as string)) {
      fail(`${at}: ${s} holding must be ranks A K Q J T 9…2 (got ${JSON.stringify(hand[s])})`)
    }
  }
}

/** Validate one exercise (Contract 3 `bidding`) and return it typed. Shared by
 *  the block parser (one embedded exercise) and the lesson parser (many). */
export function assertExercise(ex: unknown, at = 'exercise'): QuizExercise {
  if (!ex || typeof ex !== 'object') fail(`missing \`${at}\``)
  const e = ex as Record<string, unknown>
  if (typeof e.id !== 'string' || !e.id) fail(`${at}.id is required`)
  if (e.type !== 'bidding') fail(`${at}.type must be "bidding" (got ${JSON.stringify(e.type)})`)
  if (typeof e.title !== 'string' || !e.title) fail(`${at}.title is required`)
  if (typeof e.prompt !== 'string' || !e.prompt) fail(`${at}.prompt is required`)
  if (!Array.isArray(e.questions) || e.questions.length === 0) fail(`${at}.questions must be a non-empty array`)
  e.questions.forEach(validateQuestion)
  return ex as QuizExercise
}

function validateQuestion(q: unknown, i: number): void {
  const at = `question ${i + 1}`
  if (!q || typeof q !== 'object') fail(`${at}: not an object`)
  const question = q as Record<string, unknown>
  validateHand(question.hand, at)
  if (typeof question.answer !== 'string' || !CALL_RE.test(question.answer)) {
    fail(`${at}: answer must be a call like "1D", "3NT", "P", "X" (got ${JSON.stringify(question.answer)})`)
  }
  if (question.seat != null && !SEATS.includes(question.seat as string)) fail(`${at}: bad seat ${JSON.stringify(question.seat)}`)
  if (question.dealer != null && !SEATS.includes(question.dealer as string)) fail(`${at}: bad dealer ${JSON.stringify(question.dealer)}`)
  if (question.vulnerability != null && !VULNS.includes(question.vulnerability as Vulnerability)) {
    fail(`${at}: bad vulnerability ${JSON.stringify(question.vulnerability)}`)
  }
  if (question.context != null) {
    const calls = (question.context as Record<string, unknown>).calls
    if (!Array.isArray(calls)) fail(`${at}: context.calls must be an array`)
    calls.forEach((c) => { if (typeof c !== 'string' || !CALL_RE.test(c)) fail(`${at}: bad call ${JSON.stringify(c)} in context`) })
  }
  if (question.alternates != null) {
    if (!Array.isArray(question.alternates)) fail(`${at}: alternates must be an array`)
    question.alternates.forEach((c) => { if (typeof c !== 'string' || !CALL_RE.test(c)) fail(`${at}: bad alternate ${JSON.stringify(c)}`) })
  }
}

/** Parse and validate a `quiz` block body. Throws a friendly error on any issue. */
export function parseQuizBlock(body: string): QuizEmbed {
  let data: unknown
  try {
    data = JSON.parse(body)
  } catch (e) {
    fail(`invalid JSON: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (!data || typeof data !== 'object') fail('body must be a JSON object')
  const d = data as Record<string, unknown>
  if (d.schema !== 'quiz-embed/v1') fail('schema must be "quiz-embed/v1"')

  const source = d.source as Record<string, unknown> | undefined
  if (!source || typeof source.lesson_id !== 'string' || !source.lesson_id) fail('`source.lesson_id` is required')

  assertExercise(d.exercise)

  return data as QuizEmbed
}

/** Canonical JSON for a quiz block body (what the picker writes). */
export function serializeQuizBlock(embed: QuizEmbed): string {
  return JSON.stringify(embed, null, 2)
}

/** Build a quiz-embed from a source lesson's exercise and a chosen question subset. */
export function buildQuizEmbed(
  source: QuizSource,
  exercise: QuizExercise,
  questions: BiddingQuestion[] = exercise.questions,
): QuizEmbed {
  return { schema: 'quiz-embed/v1', source, exercise: { ...exercise, questions } }
}

/** One quiz block's answers, for the document's collected answer section. */
export interface QuizAnswerGroup {
  prompt: string
  answers: { answer: Call; alternates?: Call[]; explanation?: string }[]
}

/**
 * Collect every quiz block's answers from a lesson, in document order, grouped
 * by prompt. Drives the print/preview answer section (Q4). Invalid quiz blocks
 * are skipped — the answer section never breaks a render.
 */
export function collectQuizAnswers(markdown: string): QuizAnswerGroup[] {
  const groups: QuizAnswerGroup[] = []
  for (const block of scanReservedBlocks(markdown)) {
    if (block.tag !== 'quiz') continue
    try {
      const { exercise } = parseQuizBlock(block.body)
      groups.push({
        prompt: exercise.prompt,
        answers: exercise.questions.map((q) => ({ answer: q.answer, alternates: q.alternates, explanation: q.explanation })),
      })
    } catch {
      /* skip an unparseable quiz block */
    }
  }
  return groups
}
