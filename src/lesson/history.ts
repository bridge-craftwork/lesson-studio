/**
 * History / Recent — the Lobby's "what was I working on" surface. One merged,
 * newest-first list that dissolves the old drafts-are-a-separate-thing feeling:
 * autosaved drafts and (Phase B) recently-opened files interleave by time, each
 * tagged with its `kind` so provenance is still legible.
 *
 * Drafts are the single source: every open document autosaves one, so History
 * is draft-sourced and stays synchronous. A draft that backs a disk file
 * carries a `handleKey` (handles.ts / IndexedDB) and is tagged `file` rather
 * than `draft` — one row per document, no draft/file duplication.
 */
import { listDrafts } from './drafts'

export interface HistoryEntry {
  /** Stable key for list rendering and actions. */
  key: string
  kind: 'draft' | 'file'
  title: string
  updatedAt: number
  draftId?: string
  handleKey?: string
}

export function listHistory(): HistoryEntry[] {
  return listDrafts()
    .map((d) => ({
      key: `draft:${d.id}`,
      kind: d.handleKey ? ('file' as const) : ('draft' as const),
      title: d.title,
      updatedAt: d.updatedAt,
      draftId: d.id,
      handleKey: d.handleKey,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * A document and its older drafts. Reopening the same file or restarting the
 * same template mints a fresh draft each time, so several rows can describe one
 * document; History shows the newest (`primary`) and tucks the rest into
 * `older`, which the Lobby reveals on demand — earlier drafts rarely matter.
 */
export interface HistoryGroup {
  key: string
  primary: HistoryEntry
  older: HistoryEntry[]
}

// Same document ⇒ same backing file (handleKey), else same non-empty title
// (repeat template starts). An untitled draft-only entry groups by its own id,
// so distinct blanks don't collapse into one.
function groupKey(e: HistoryEntry): string {
  if (e.handleKey) return `h:${e.handleKey}`
  const title = e.title.trim().toLowerCase()
  return title ? `t:${title}` : `id:${e.draftId}`
}

export function groupHistory(entries: HistoryEntry[]): HistoryGroup[] {
  const groups = new Map<string, HistoryEntry[]>()
  for (const e of entries) {
    const k = groupKey(e)
    const bucket = groups.get(k)
    if (bucket) bucket.push(e)
    else groups.set(k, [e])
  }
  return [...groups.entries()]
    .map(([key, es]) => {
      es.sort((a, b) => b.updatedAt - a.updatedAt)
      return { key, primary: es[0], older: es.slice(1) }
    })
    .sort((a, b) => b.primary.updatedAt - a.primary.updatedAt)
}

export function listHistoryGroups(): HistoryGroup[] {
  return groupHistory(listHistory())
}
