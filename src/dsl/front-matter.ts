import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import type { FrontMatter } from './types'

/** A lesson split into its front matter and body (Contract 1 / Contract 4). */
export interface SplitDocument {
  /** The exact front-matter block including `---` fences, or null if absent. */
  raw: string | null
  /** The parsed front matter, or null if absent/unparseable. */
  data: Partial<FrontMatter> | null
  /** The markdown after the front matter. */
  body: string
}

// Leading `---` … `---` block. Kept verbatim in `raw` for lossless re-join.
const FRONT_MATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/

/**
 * Split a lesson document into front matter and body. The front-matter block is
 * kept verbatim in `raw` so it can be re-prepended on save without YAML
 * reformatting; `data` is the parsed view for rendering.
 */
export function splitFrontMatter(markdown: string): SplitDocument {
  const m = markdown.match(FRONT_MATTER_RE)
  if (!m) return { raw: null, data: null, body: markdown }

  let data: Partial<FrontMatter> | null = null
  try {
    const parsed = parseYaml(m[1])
    data = parsed && typeof parsed === 'object' ? (parsed as Partial<FrontMatter>) : null
  } catch {
    data = null
  }
  return { raw: m[0], data, body: markdown.slice(m[0].length) }
}

/** Re-prepend the raw front matter to a body (the inverse of splitting). */
export function joinFrontMatter(raw: string | null, body: string): string {
  return raw ? raw + body : body
}

/**
 * Serialize front matter to a canonical `---` block, fields in a fixed order,
 * empty optional fields omitted. Returns '' when there's no `title` (so a plain
 * markdown document without metadata stays plain). This is the write path when
 * front matter is edited — it replaces the verbatim `raw` with canonical YAML.
 */
export function serializeFrontMatter(fm: Partial<FrontMatter>): string {
  if (!fm.title) return ''
  const ordered: Record<string, unknown> = { title: fm.title }
  if (fm.skill_paths?.length) ordered.skill_paths = fm.skill_paths
  if (fm.primary) ordered.primary = fm.primary
  if (fm.level) ordered.level = fm.level
  if (fm.author) ordered.author = fm.author
  if (fm.status) ordered.status = fm.status
  if (fm['reviewed-by']) ordered['reviewed-by'] = fm['reviewed-by']
  if (fm.columns && fm.columns !== 2) ordered.columns = fm.columns
  if (fm['font-size'] && fm['font-size'] !== 12) ordered['font-size'] = fm['font-size']
  if (fm['text-scale'] && fm['text-scale'] !== 1) ordered['text-scale'] = fm['text-scale']
  return `---\n${stringifyYaml(ordered).trimEnd()}\n---\n`
}

/** Print typography defaults (Contract 4). Sized for senior legibility. */
export const DEFAULT_FONT_SIZE_PT = 12
export const DEFAULT_TEXT_SCALE = 1
export const DEFAULT_COLUMNS = 2

export interface PrintTypography {
  columns: number
  /** Authored base size, in points. */
  fontSizePt: number
  /** Nudge multiplier applied on top. */
  textScale: number
  /** What actually renders: `fontSizePt * textScale`, in points. */
  effectivePt: number
}

/**
 * Resolve the print typography from front matter, defaults applied. Shared by
 * the print view and the live preview so the two can never disagree about what
 * a lesson looks like — the preview's page count would be a lie if they did.
 */
export function printTypography(data: Partial<FrontMatter> | null | undefined): PrintTypography {
  const columns = numberOr(data?.columns, DEFAULT_COLUMNS)
  const fontSizePt = numberOr(data?.['font-size'], DEFAULT_FONT_SIZE_PT)
  const textScale = numberOr(data?.['text-scale'], DEFAULT_TEXT_SCALE)
  return {
    columns,
    fontSizePt,
    textScale,
    // Rounded to hundredths: a raw float here ends up in a CSS length, and
    // sub-hundredth jitter would make measurements irreproducible.
    effectivePt: Math.round(fontSizePt * textScale * 100) / 100,
  }
}

function numberOr(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/**
 * A human title for a lesson: the front-matter `title`, else the first H1
 * heading in the body, else 'Untitled lesson'.
 */
export function lessonTitle(markdown: string): string {
  const { data, body } = splitFrontMatter(markdown)
  if (data?.title) return data.title
  const heading = body.match(/^#\s+(.+)$/m)
  return heading ? heading[1].trim() : 'Untitled lesson'
}
