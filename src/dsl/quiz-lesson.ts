/**
 * Contract 3 `quiz-lesson/v1` — the file the Practice-Bidding-Scenarios pipeline
 * emits and the quiz picker reads. A lesson is one PBS scenario: identity +
 * provenance + every exercise it yielded. The picker browses these exercises
 * and embeds a chosen subset into a lesson document as a `quiz` block
 * (`quiz-embed/v1`, see quiz-block.ts).
 *
 * This is the *source* shape; `parseQuizBlock` handles the *embedded* shape.
 */
import { assertExercise, type QuizExercise, type QuizSource } from './quiz-block'

export interface QuizProvenance {
  source: string
  pipeline_version: string
  generated: string
  source_quiz: string
}

export interface QuizLesson {
  schema: 'quiz-lesson/v1'
  id: string
  title: string
  skill_paths?: string[]
  provenance: QuizProvenance
  exercises: QuizExercise[]
}

/** Parse and validate a `quiz-lesson/v1` file (text or already-parsed object). */
export function parseQuizLesson(input: string | unknown): QuizLesson {
  let data: unknown
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input)
    } catch (e) {
      throw new Error(`invalid JSON: ${e instanceof Error ? e.message : String(e)}`)
    }
  } else {
    data = input
  }
  if (!data || typeof data !== 'object') throw new Error('quiz lesson must be a JSON object')
  const d = data as Record<string, unknown>
  if (d.schema !== 'quiz-lesson/v1') throw new Error(`not a quiz lesson: schema is ${JSON.stringify(d.schema)}`)
  if (typeof d.id !== 'string' || !d.id) throw new Error('quiz lesson: `id` is required')
  if (typeof d.title !== 'string' || !d.title) throw new Error('quiz lesson: `title` is required')
  if (!Array.isArray(d.exercises) || d.exercises.length === 0) throw new Error('quiz lesson: `exercises` must be a non-empty array')
  d.exercises.forEach((ex, i) => assertExercise(ex, `exercises[${i}]`))
  return data as QuizLesson
}

/** The provenance a picked exercise carries into its embedded quiz block. */
export function quizSourceFromLesson(lesson: QuizLesson): QuizSource {
  return {
    lesson_id: lesson.id,
    title: lesson.title,
    generated: lesson.provenance?.generated,
    pipeline_version: lesson.provenance?.pipeline_version,
  }
}

/** Total questions across a lesson's exercises (for the picker's counts). */
export function questionCount(lesson: QuizLesson): number {
  return lesson.exercises.reduce((n, ex) => n + ex.questions.length, 0)
}

/** One row of the `quiz-index/v1` manifest — a projection of a lesson envelope. */
export interface QuizManifestEntry {
  id: string
  title: string
  exercise_count?: number
  question_count?: number
  skill_paths?: string[]
  file: string
}

export interface QuizManifest {
  schema: 'quiz-index/v1'
  generated?: string
  pipeline_version?: string
  lessons: QuizManifestEntry[]
}

/** Parse the `index.json` manifest a quiz folder carries. Lenient about extra keys. */
export function parseQuizManifest(input: string | unknown): QuizManifest {
  let data: unknown
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input)
    } catch (e) {
      throw new Error(`invalid JSON: ${e instanceof Error ? e.message : String(e)}`)
    }
  } else {
    data = input
  }
  const d = data as Record<string, unknown> | null
  if (!d || d.schema !== 'quiz-index/v1') throw new Error(`not a quiz manifest: schema is ${JSON.stringify(d?.schema)}`)
  if (!Array.isArray(d.lessons)) throw new Error('quiz manifest: `lessons` must be an array')
  const lessons = d.lessons
    .filter((l): l is QuizManifestEntry => !!l && typeof (l as QuizManifestEntry).id === 'string' && typeof (l as QuizManifestEntry).file === 'string')
    .map((l) => ({
      id: l.id,
      title: l.title ?? l.id,
      exercise_count: l.exercise_count,
      question_count: l.question_count,
      skill_paths: l.skill_paths,
      file: l.file,
    }))
  return { schema: 'quiz-index/v1', generated: d.generated as string, pipeline_version: d.pipeline_version as string, lessons }
}

export type { QuizExercise }
