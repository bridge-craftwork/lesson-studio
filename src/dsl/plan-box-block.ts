/**
 * Contract 1 `plan-box` block — the declarer-play planning worksheet.
 *
 * Two stacked sections: **count** the tricks (one cell per suit plus a total),
 * then **decide** which technique produces the ones you're missing. The
 * `winners` variant counts sure winners and develops them; the `losers` variant
 * counts fast/slow losers and reduces them. Each section is a header bar, a
 * label row and a value row — three rows, one flag.
 *
 * Cells are free text, so a worked example can say `♦K` or `2+` where a blank
 * worksheet says nothing. Both authoring forms parse:
 *
 *   counts: 2 | 1 | 3 | 1 | 7        ← pipe rows (canonical; what we serialize)
 *   S: 2                             ← key lines, matching the `hand` block
 *
 * and for the technique row, `plan: …` or a key line per column label
 * (`promotion: 2`). Key matching ignores case, spaces and hyphens, so
 * `end play`, `End-Play` and `endplay` all name the same column.
 */

export type PlanTable = 'winners' | 'losers'

/** A parsed `plan-box` block. Cells are `''` when blank. */
export interface PlanBoxBlock {
  table: PlanTable
  /** Show the counting section (header + suit labels + values). */
  counting: boolean
  /** Show the technique section (header + technique labels + values). */
  techniques: boolean
  /** The four suit cells, in S H D C order. */
  counts: string[]
  /** The total cell **as authored**; blank/absent lets the renderer sum. */
  total?: string
  /** One cell per technique column, left to right. */
  plan: string[]
  /** Technique column labels, when the author overrode the variant's. */
  labels?: string[]
}

/**
 * The default technique columns per variant. `PlanBox.vue` owns *display* and
 * carries its own copy (it must stand alone as a package component); these
 * exist so a key line — `promotion: 2` — can be matched to a column.
 */
export const PLAN_TECHNIQUES: Record<PlanTable, string[]> = {
  winners: ['Promotion', 'Length', 'Finesse', 'End Play'],
  losers: ['Ruffs', 'Finesse', 'Pitch', 'Length'],
}

const SUIT_INDEX: Record<string, number> = { s: 0, h: 1, d: 2, c: 3 }
const BOOLS: Record<string, boolean> = {
  on: true,
  off: false,
  yes: true,
  no: false,
  true: true,
  false: false,
}

/** Key/label identity: case, spaces and hyphens don't distinguish two keys. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Split a value row into cells. Pipes only — a cell may contain commas. */
const cells = (value: string) => value.split('|').map((c) => c.trim())

/** Trailing blanks carry no information; drop them. */
function trimTrailing(list: string[]): string[] {
  const out = [...list]
  while (out.length && out[out.length - 1] === '') out.pop()
  return out
}

export function parsePlanBox(body: string): PlanBoxBlock {
  const entries: { key: string; value: string; raw: string }[] = []
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    if (line === '') continue
    const colon = line.indexOf(':')
    if (colon === -1) throw new Error(`unrecognized line in plan-box block: "${line}"`)
    entries.push({ key: line.slice(0, colon).trim(), value: line.slice(colon + 1).trim(), raw: line })
  }

  // `table` and `labels` decide what a technique key line *means*, and both are
  // legal anywhere in the body — so resolve them before walking the rest.
  let table: PlanTable = 'winners'
  let labels: string[] | undefined
  for (const e of entries) {
    const key = norm(e.key)
    if (key === 'table') {
      const value = e.value.toLowerCase()
      if (value !== 'winners' && value !== 'losers') {
        throw new Error(`plan-box \`table\` must be winners or losers, got "${e.value}"`)
      }
      table = value
    } else if (key === 'labels') {
      // Commas read better for a label list (as `auction` does); pipes win when
      // both appear, so a label containing a comma stays one label.
      const raw = e.value.includes('|') ? e.value.split('|') : e.value.split(',')
      const list = raw.map((l) => l.trim()).filter((l) => l !== '')
      labels = list.length ? list : undefined
    }
  }

  const columns = labels ?? PLAN_TECHNIQUES[table]
  const counts = ['', '', '', '']
  const plan = columns.map(() => '')
  let total: string | undefined
  let counting = true
  let techniques = true

  for (const e of entries) {
    const key = norm(e.key)
    if (key === 'table' || key === 'labels') continue

    if (key === 'counting' || key === 'techniques') {
      const flag = BOOLS[e.value.toLowerCase()]
      if (flag === undefined) throw new Error(`plan-box \`${e.key}\` must be on or off, got "${e.value}"`)
      if (key === 'counting') counting = flag
      else techniques = flag
      continue
    }

    if (key === 'counts') {
      const row = cells(e.value)
      if (row.length > 5) {
        throw new Error('plan-box `counts` takes at most five cells: S | H | D | C | total')
      }
      row.forEach((cell, i) => {
        if (i < 4) counts[i] = cell
        else if (cell !== '') total = cell
      })
      continue
    }

    if (key === 'plan') {
      const row = cells(e.value)
      if (row.length > columns.length) {
        throw new Error(
          `plan-box \`plan\` takes at most ${columns.length} cells (${columns.join(', ')})`,
        )
      }
      row.forEach((cell, i) => (plan[i] = cell))
      continue
    }

    if (key === 'total') {
      total = e.value || undefined
      continue
    }

    if (key.length === 1 && key in SUIT_INDEX) {
      counts[SUIT_INDEX[key]] = e.value
      continue
    }

    const column = columns.findIndex((label) => norm(label) === key)
    if (column !== -1) {
      plan[column] = e.value
      continue
    }

    throw new Error(`unrecognized line in plan-box block: "${e.raw}"`)
  }

  if (!counting && !techniques) {
    throw new Error('plan-box has nothing to show — `counting` and `techniques` are both off')
  }

  return { table, counting, techniques, counts, total, plan, labels }
}

/**
 * Serialize to the canonical body: keys first (defaults omitted), then the two
 * value rows in pipe form. `parsePlanBox ∘ serializePlanBox` is the identity,
 * and the result is idempotent — the `--fix` formatter for either input form.
 */
export function serializePlanBox(block: PlanBoxBlock): string {
  const lines: string[] = [`table: ${block.table}`]
  if (!block.counting) lines.push('counting: off')
  if (!block.techniques) lines.push('techniques: off')
  if (block.labels) lines.push(`labels: ${block.labels.join(', ')}`)

  // An authored total is the fifth cell, so the four suit cells have to be
  // present (as empty cells) to position it even when they're blank.
  const counts = block.total ? [...block.counts.slice(0, 4), block.total] : trimTrailing(block.counts)
  if (counts.length) lines.push(`counts: ${counts.join(' | ')}`)

  const plan = trimTrailing(block.plan)
  if (plan.length) lines.push(`plan: ${plan.join(' | ')}`)

  return lines.join('\n')
}
