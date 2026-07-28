import { ref, computed, watch } from 'vue'
import { lessonTitle } from '@/dsl'
import { getTemplate } from './templates'
import {
  listDrafts,
  upsertDraft,
  removeDraft,
  getDraft,
  type Draft,
} from './drafts'
import {
  openLessonFile,
  saveLessonAs,
  saveToHandle,
  supportsFsAccess,
  type FileHandle,
} from './files'
import { rememberFile, getEntry, ensurePermission } from './handles'
import { readSession, writeSession } from './sessionStore'

const AUTOSAVE_MS = 800
/** Hand-off key: the editor stashes the current lesson here for the print tab. */
export const PRINT_STASH_KEY = 'lesson-studio:print'

/**
 * Owns the editing session: whether a document is open at all (`location`), what
 * lesson is loaded, its live markdown, the backing file handle (if any), dirty
 * state, and the localStorage draft autosave. The editor is reloaded only on
 * enter-document / restore (via `loadId`), never on internal edits.
 *
 * `location` is persisted (sessionStore): a relaunch returns to the Lobby or to
 * the last document, and **Close** records "I'm done" by writing the Lobby back.
 */
export function useLessonSession() {
  const location = ref<'lobby' | 'document'>('lobby')
  const loadedMarkdown = ref('') // fed to the editor; changes on load
  const liveMarkdown = ref('') // latest from the editor
  const savedMarkdown = ref('') // last persisted (dirty baseline)
  const loadId = ref(0) // bump to remount the editor
  const fileName = ref('untitled.md')
  const handle = ref<FileHandle | null>(null)
  const handleKey = ref<string | undefined>(undefined) // IDB key of the backing file
  const draftId = ref<string>(crypto.randomUUID())
  const drafts = ref<Draft[]>(listDrafts())

  let autosaveTimer: ReturnType<typeof setTimeout> | undefined

  const dirty = computed(() => liveMarkdown.value !== savedMarkdown.value)
  const title = computed(() => lessonTitle(liveMarkdown.value))
  const canSaveInPlace = computed(() => supportsFsAccess && handle.value !== null)

  function refreshDrafts() {
    drafts.value = listDrafts()
  }

  function persistSession() {
    writeSession(
      location.value === 'document'
        ? {
            location: 'document',
            draftId: draftId.value,
            handleKey: handleKey.value,
            fileName: fileName.value,
          }
        : { location: 'lobby' },
    )
  }

  /** Enter the document view with the given lesson, remounting the editor. */
  function load(
    markdown: string,
    opts: { name: string; handle: FileHandle | null; id?: string; handleKey?: string },
  ) {
    loadedMarkdown.value = markdown
    liveMarkdown.value = markdown
    savedMarkdown.value = markdown
    fileName.value = opts.name
    handle.value = opts.handle
    handleKey.value = opts.handleKey
    draftId.value = opts.id ?? crypto.randomUUID()
    location.value = 'document'
    loadId.value += 1
    // Persist a draft up front so the document is restorable on reload even
    // before the first edit — restoreLocation() reconstitutes it by draft id.
    persistDraft()
    persistSession()
  }

  // Called by the editor (via LessonDocument) on every change with the full
  // reconstructed lesson markdown. Milkdown's listener only fires on real
  // edits (never on initial mount), so any emission means a genuine change.
  function onEdit(fullMarkdown: string) {
    liveMarkdown.value = fullMarkdown
    clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(persistDraft, AUTOSAVE_MS)
  }

  function persistDraft() {
    upsertDraft({
      id: draftId.value,
      title: title.value,
      markdown: liveMarkdown.value,
      updatedAt: Date.now(),
      handleKey: handleKey.value,
    })
    refreshDrafts()
  }

  /** Start a fresh lesson from a template skeleton (Lobby → document). */
  function openTemplate(id: string) {
    const template = getTemplate(id)
    if (!template) return
    load(template.markdown, { name: 'untitled.md', handle: null })
  }

  async function open() {
    const file = await openLessonFile()
    if (!file) return
    // Persist the handle so this file survives a reload and joins Recent/Favorites.
    const key = file.handle ? await rememberFile(file.handle).catch(() => undefined) : undefined
    load(file.text, { name: file.name, handle: file.handle, handleKey: key })
  }

  async function save() {
    if (supportsFsAccess && handle.value) {
      // The handle may have lost permission across a reload — re-request (this
      // runs inside the Save click, the gesture the browser requires).
      if (!(await ensurePermission(handle.value, 'readwrite'))) return
      await saveToHandle(handle.value, liveMarkdown.value)
      savedMarkdown.value = liveMarkdown.value
      persistDraft()
      return
    }
    await saveAs()
  }

  async function saveAs() {
    const newHandle = await saveLessonAs(liveMarkdown.value, fileName.value)
    if (newHandle) {
      handle.value = newHandle
      if (newHandle.name) fileName.value = newHandle.name
      handleKey.value = await rememberFile(newHandle).catch(() => undefined)
      persistSession()
    }
    savedMarkdown.value = liveMarkdown.value
    persistDraft()
  }

  function restoreDraft(id: string) {
    const draft = getDraft(id)
    if (!draft) return
    load(draft.markdown, {
      name: fileName.value,
      handle: null,
      id: draft.id,
      handleKey: draft.handleKey,
    })
    // Re-link the backing file (if any) so Save writes to disk again. The
    // handle isn't a gesture-gated step; permission is re-requested on Save.
    if (draft.handleKey) relinkHandle(draft.handleKey)
  }

  // Re-attach a persisted file handle to the open document (best-effort).
  async function relinkHandle(key: string) {
    const entry = await getEntry(key)
    if (entry && handleKey.value === key) {
      handle.value = entry.handle
      if (entry.name) fileName.value = entry.name
    }
  }

  function deleteDraft(id: string) {
    removeDraft(id)
    refreshDrafts()
  }

  /**
   * Close the document and return to the Lobby. Auto-saves a draft first (so
   * nothing is lost and the work surfaces in History) and closes silently — the
   * Lobby's History is the safety net that lets Close skip a save prompt.
   */
  function close() {
    clearTimeout(autosaveTimer)
    if (liveMarkdown.value.trim()) persistDraft()
    location.value = 'lobby'
    handle.value = null
    // Back in the Lobby nothing is "unsaved" — the draft holds the work. Clear
    // the dirty baseline so the beforeunload guard disarms.
    savedMarkdown.value = liveMarkdown.value
    persistSession()
  }

  // Stash the current lesson so the print tab renders it (not the starter).
  function stashForPrint() {
    try {
      localStorage.setItem(PRINT_STASH_KEY, liveMarkdown.value)
    } catch {
      /* best-effort */
    }
  }

  // Restore the last location. A document is reconstituted from its autosave
  // draft; if that draft is gone (pruned/cleared) we fall back to the Lobby.
  function restoreLocation() {
    const session = readSession()
    if (session.location !== 'document' || !session.draftId) return
    const draft = getDraft(session.draftId)
    if (!draft) return
    const key = draft.handleKey ?? session.handleKey
    load(draft.markdown, {
      name: session.fileName ?? 'untitled.md',
      handle: null,
      id: draft.id,
      handleKey: key,
    })
    // Re-link the backing file so Save works after reload (permission is
    // re-requested lazily on the Save click, which supplies the user gesture).
    if (key) relinkHandle(key)
  }
  restoreLocation()

  // Warn before leaving with unsaved edits.
  watch(dirty, (isDirty) => {
    window.onbeforeunload = isDirty ? (e) => (e.preventDefault(), '') : null
  })

  return {
    location,
    loadedMarkdown,
    // The latest text from the editor, for read-only consumers like the live
    // page preview. `loadedMarkdown` is deliberately NOT this — feeding it back
    // into the editor on every keystroke would remount it mid-edit.
    liveMarkdown,
    loadId,
    fileName,
    dirty,
    title,
    drafts,
    canSaveInPlace,
    supportsFsAccess,
    onEdit,
    openTemplate,
    open,
    save,
    saveAs,
    restoreDraft,
    deleteDraft,
    close,
    stashForPrint,
  }
}
