/** A locally-autosaved lesson draft (localStorage). */
export interface Draft {
  id: string
  title: string
  markdown: string
  updatedAt: number
  /**
   * If this draft backs a file on disk, the key of its persisted handle
   * (handles.ts / IndexedDB). Lets History show one row per document — tagged
   * `file` rather than `draft` — instead of a draft and a file row for the same
   * work, and lets a reload re-link Save to the original file.
   */
  handleKey?: string
}

const KEY = 'lesson-studio:drafts:v1'
const CAP = 20

export function listDrafts(): Draft[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as Draft[]) : []
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

function write(drafts: Draft[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(drafts.slice(0, CAP)))
  } catch {
    /* quota / disabled storage — drafts are best-effort */
  }
}

export function upsertDraft(draft: Draft): void {
  write([draft, ...listDrafts().filter((d) => d.id !== draft.id)])
}

export function removeDraft(id: string): void {
  write(listDrafts().filter((d) => d.id !== id))
}

export function getDraft(id: string): Draft | undefined {
  return listDrafts().find((d) => d.id === id)
}
