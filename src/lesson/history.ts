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
