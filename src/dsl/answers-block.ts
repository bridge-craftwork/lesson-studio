/**
 * Contract 1 `answers` block — the collected quiz-answer section, as a block the
 * author places (rather than an auto-appended print artifact). It carries no
 * answers of its own; its renderer gathers every `quiz` block's answers from the
 * document, in order, grouped by prompt and numbered to match (see quiz-block.ts
 * `answerGroupsFromBodies`). The body holds only display settings.
 *
 * Precede it with a `pagebreak` block to start the answers on a fresh page (the
 * ribbon does this by default); set `columns:` to lay the answers out in more
 * than one column.
 */
export interface AnswersBlock {
  /** Number of columns for the answer list (default 1). */
  columns?: number
}

export function parseAnswersBlock(body: string): AnswersBlock {
  const out: AnswersBlock = {}
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    if (line === '') continue
    const m = line.match(/^columns:\s*(\d+)\s*$/)
    if (m) {
      out.columns = Number(m[1])
      continue
    }
    throw new Error(`unrecognized line in answers block: "${line}"`)
  }
  if (out.columns != null && (out.columns < 1 || out.columns > 4)) {
    throw new Error('answers `columns` must be between 1 and 4')
  }
  return out
}
