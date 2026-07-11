import { ref, computed, watch } from 'vue'
import { lessonTitle } from '@/dsl'
import { STARTER_LESSON } from '../editor/starter'
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

const AUTOSAVE_MS = 800

/**
 * Owns the editing session: what lesson is loaded, its live markdown, the
 * backing file handle (if any), dirty state, and the localStorage draft
 * autosave. The editor is reloaded only on New/Open/Restore (via `loadId`),
 * never on internal edits.
 */
export function useLessonSession() {
  const loadedMarkdown = ref(STARTER_LESSON) // fed to the editor; changes on load
  const liveMarkdown = ref(STARTER_LESSON) // latest from the editor
  const savedMarkdown = ref(STARTER_LESSON) // last persisted (dirty baseline)
  const loadId = ref(0) // bump to remount the editor
  const fileName = ref('untitled.md')
  const handle = ref<FileHandle | null>(null)
  const draftId = ref<string>(crypto.randomUUID())
  const drafts = ref<Draft[]>(listDrafts())

  let autosaveTimer: ReturnType<typeof setTimeout> | undefined

  const dirty = computed(() => liveMarkdown.value !== savedMarkdown.value)
  const title = computed(() => lessonTitle(liveMarkdown.value))
  const canSaveInPlace = computed(() => supportsFsAccess && handle.value !== null)

  function refreshDrafts() {
    drafts.value = listDrafts()
  }

  function load(markdown: string, opts: { name: string; handle: FileHandle | null; id?: string }) {
    loadedMarkdown.value = markdown
    liveMarkdown.value = markdown
    savedMarkdown.value = markdown
    fileName.value = opts.name
    handle.value = opts.handle
    draftId.value = opts.id ?? crypto.randomUUID()
    loadId.value += 1
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
    })
    refreshDrafts()
  }

  function newLesson() {
    load(STARTER_LESSON, { name: 'untitled.md', handle: null })
  }

  async function open() {
    const file = await openLessonFile()
    if (file) load(file.text, { name: file.name, handle: file.handle })
  }

  async function save() {
    if (supportsFsAccess && handle.value) {
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
    }
    savedMarkdown.value = liveMarkdown.value
    persistDraft()
  }

  function restoreDraft(id: string) {
    const draft = getDraft(id)
    if (draft) load(draft.markdown, { name: fileName.value, handle: null, id: draft.id })
  }

  function deleteDraft(id: string) {
    removeDraft(id)
    refreshDrafts()
  }

  // Warn before leaving with unsaved edits.
  watch(dirty, (isDirty) => {
    window.onbeforeunload = isDirty ? (e) => (e.preventDefault(), '') : null
  })

  return {
    loadedMarkdown,
    loadId,
    fileName,
    dirty,
    title,
    drafts,
    canSaveInPlace,
    supportsFsAccess,
    onEdit,
    newLesson,
    open,
    save,
    saveAs,
    restoreDraft,
    deleteDraft,
  }
}
