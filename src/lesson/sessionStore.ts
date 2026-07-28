/**
 * Persisted session *location*, so a relaunch returns you where you were — which
 * may be the Lobby. This is the crux of the Lobby model (see
 * documentation/lobby-and-session.md): restoring the last *location* rather than
 * the last *document* makes "resume where I was" and "don't resurrect work I
 * Closed" the same mechanism. Closing records intent by writing `lobby` here.
 *
 * The reference is deliberately thin: a draft id is enough to reconstitute an
 * open document, because every open document autosaves a draft. A backing file
 * handle can't be serialized to localStorage; it's persisted separately in
 * IndexedDB (see handles.ts) and re-linked by `handleKey`.
 */
export type SessionLocation = 'lobby' | 'document'

export interface SessionState {
  location: SessionLocation
  /** The autosave draft that reconstitutes the open document, if any. */
  draftId?: string
  /** The file this document writes back to, keyed into the IndexedDB handle store. */
  handleKey?: string
  /** Display name of the backing file (cosmetic; the handle is authoritative). */
  fileName?: string
}

const KEY = 'lesson-studio:session:v1'

const LOBBY: SessionState = { location: 'lobby' }

export function readSession(): SessionState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...LOBBY }
    const parsed = JSON.parse(raw) as SessionState
    return parsed.location === 'document' ? parsed : { ...LOBBY }
  } catch {
    return { ...LOBBY }
  }
}

export function writeSession(state: SessionState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* best-effort; a lost location just means we open the Lobby */
  }
}
