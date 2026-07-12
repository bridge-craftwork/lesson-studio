import { splitFrontMatter } from './front-matter'
import { scanReservedBlocks } from './scan'
import { parseHandBlock } from './hand-block'
import { parseHandsBlock } from './hands-block'
import { parseAuctionBlock } from './auction-block'
import { parseResponseBox } from './response-box-block'
import { parseRowBlock } from './row-block'
import type { ReservedBlock } from './types'
import taxonomy from './taxonomy.json'

export interface LintIssue {
  severity: 'error' | 'warning'
  message: string
}

export interface ValidateOptions {
  /** Valid skill paths (Contract 4). Defaults to the bundled stopgap taxonomy. */
  validSkillPaths?: Set<string>
}

const LEVELS = ['basic', 'intermediate', 'advanced', 'expert']
const STATUSES = ['draft', 'published']
const DEFAULT_PATHS = new Set<string>((taxonomy as { paths: string[] }).paths)

/**
 * Validate a lesson document (Contract 1 + Contract 4), returning lint issues.
 * Pure and Node-safe — used by the CI lint CLI and, later, editor inline
 * validation. Rendering ("page renders") is a separate, browser-based check.
 */
export function validateLesson(markdown: string, opts: ValidateOptions = {}): LintIssue[] {
  const issues: LintIssue[] = []
  const validPaths = opts.validSkillPaths ?? DEFAULT_PATHS

  const { data, body } = splitFrontMatter(markdown)
  validateFrontMatter(data, validPaths, issues)

  for (const block of scanReservedBlocks(body)) {
    validateBlock(block.tag, block.body, issues)
  }

  return issues
}

function validateFrontMatter(
  data: Record<string, unknown> | null,
  validPaths: Set<string>,
  issues: LintIssue[],
): void {
  if (!data) {
    issues.push({ severity: 'error', message: 'missing YAML front matter' })
    return
  }
  const err = (message: string) => issues.push({ severity: 'error', message })

  if (!data.title || typeof data.title !== 'string') err('front matter: `title` is required')
  if (!data.author) err('front matter: `author` is required')
  if (!data['reviewed-by']) err('front matter: `reviewed-by` is required')
  if (!LEVELS.includes(data.level as string)) err(`front matter: \`level\` must be one of ${LEVELS.join(', ')}`)
  if (!STATUSES.includes(data.status as string)) err(`front matter: \`status\` must be one of ${STATUSES.join(', ')}`)

  const paths = data.skill_paths
  if (!Array.isArray(paths) || paths.length === 0) {
    err('front matter: `skill_paths` must be a non-empty list')
  } else {
    for (const p of paths) {
      if (!validPaths.has(p as string)) {
        err(`front matter: skill path "${p}" is not in the taxonomy`)
      }
    }
    if (data.primary && !paths.includes(data.primary)) {
      err(`front matter: \`primary\` "${data.primary}" is not one of \`skill_paths\``)
    }
  }
}

function validateBlock(tag: ReservedBlock, body: string, issues: LintIssue[]): void {
  const err = (message: string) => issues.push({ severity: 'error', message: `\`${tag}\` block: ${message}` })
  try {
    switch (tag) {
      case 'hand':
        parseHandBlock(body)
        break
      case 'hands':
        parseHandsBlock(body)
        break
      case 'auction':
        parseAuctionBlock(body)
        break
      case 'response-box':
        parseResponseBox(body)
        break
      case 'quiz':
        validateQuiz(body)
        break
      case 'row':
        for (const item of parseRowBlock(body)) {
          if (item.kind === 'block') validateBlock(item.tag, item.body, issues)
        }
        break
      case 'pagebreak':
        if (body.trim() !== '') err('body must be empty')
        break
      case 'deal':
        // Phase 1: structurally reserved, not resolved. Accept.
        break
    }
  } catch (e) {
    err(e instanceof Error ? e.message : String(e))
  }
}

function validateQuiz(body: string): void {
  const quiz = JSON.parse(body) as Record<string, unknown>
  if (quiz.schema !== 'quiz/v1') throw new Error('schema must be "quiz/v1"')
  if (!quiz.type) throw new Error('missing `type`')
  if (!Array.isArray(quiz.items) || quiz.items.length === 0) throw new Error('`items` must be a non-empty array')
}
