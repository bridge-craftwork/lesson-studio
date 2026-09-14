import { isCheckCell } from './cell-text'

export type TableAlign = 'left' | 'center' | 'right'

/** A parsed `table` block (Contract 1). */
export interface TableBlock {
  title?: string
  /** Column headings; absent for a headless table. */
  header?: string[]
  /** Authored per-column alignment; `undefined` entries mean "auto". */
  align?: (TableAlign | undefined)[]
  /** Body rows, each padded to the column count. */
  rows: string[][]
  /** Footer notes, one per `---` section, in order. Line breaks are kept. */
  notes: string[]
}

const KEY_LINE = /^(title|header|align):\s*(.*)$/
const ALIGN: Record<string, TableAlign> = {
  l: 'left',
  left: 'left',
  c: 'center',
  center: 'center',
  r: 'right',
  right: 'right',
}

const cells = (line: string) => line.split('|').map((c) => c.trim())

/**
 * Parse a `table` block body: optional `title:`, `header:` and `align:` keys,
 * then `a | b | c` rows, then any number of footer notes, each after its own
 * `---` line. A line break inside a note is kept.
 *
 * Unlike a GFM table there are no outer pipes and no delimiter row — a leading
 * `|` means the first cell is blank, which a comparison table needs.
 */
export function parseTable(body: string): TableBlock {
  const [rowPart, ...noteParts] = body.split(/^---\s*$/m)

  let title: string | undefined
  let header: string[] | undefined
  let alignRaw: string[] | undefined
  const rows: string[][] = []
  for (const rawLine of rowPart.split('\n')) {
    const line = rawLine.trim()
    if (line === '') continue
    const key = line.match(KEY_LINE)
    if (key) {
      const [, name, value] = key
      if (name === 'title') title = value.trim() || undefined
      else if (name === 'header') header = cells(value)
      else alignRaw = cells(value)
      continue
    }
    if (!line.includes('|')) throw new Error(`table row missing "|": "${line}"`)
    rows.push(cells(line))
  }
  if (rows.length === 0) throw new Error('table has no rows')

  const width = header?.length ?? Math.max(...rows.map((r) => r.length))
  rows.forEach((row, i) => {
    if (row.length > width) {
      throw new Error(`table row ${i + 1} has ${row.length} cells, but the header has ${width}`)
    }
    while (row.length < width) row.push('')
  })

  let align: (TableAlign | undefined)[] | undefined
  if (alignRaw) {
    if (alignRaw.length > width) throw new Error(`table align lists ${alignRaw.length} columns, but there are ${width}`)
    align = alignRaw.map((a) => {
      if (a === '') return undefined
      const v = ALIGN[a.toLowerCase()]
      if (!v) throw new Error(`table align "${a}" must be left, center or right`)
      return v
    })
  }

  // An empty section (two `---` lines in a row) adds no note.
  const notes = noteParts
    .map((part) =>
      part
        .split('\n')
        .map((l) => l.trim())
        .join('\n')
        .trim()
    )
    .filter(Boolean)
  return { title, header, align, rows, notes }
}

/**
 * The alignment each column actually renders with. An authored `align` wins;
 * otherwise a column whose body cells are all checkboxes, short numbers or
 * blank is centred (a tick column or a priority number reads as a marker, not
 * as text), and everything else is left-aligned.
 */
export function resolveTableAlign(table: TableBlock): TableAlign[] {
  const width = table.rows[0]?.length ?? 0
  return Array.from({ length: width }, (_, col) => {
    const authored = table.align?.[col]
    if (authored) return authored
    const marker = table.rows.every((row) => {
      const c = row[col]
      return c === '' || isCheckCell(c) || /^\d{1,2}[a-z]?\.?$/.test(c)
    })
    return marker ? 'center' : 'left'
  })
}
