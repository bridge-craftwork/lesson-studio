import { parse as parseYaml } from 'yaml'
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
 * A human title for a lesson: the front-matter `title`, else the first H1
 * heading in the body, else 'Untitled lesson'.
 */
export function lessonTitle(markdown: string): string {
  const { data, body } = splitFrontMatter(markdown)
  if (data?.title) return data.title
  const heading = body.match(/^#\s+(.+)$/m)
  return heading ? heading[1].trim() : 'Untitled lesson'
}
