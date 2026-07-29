/**
 * The quiz source — a remembered PBS `quiz/` folder and its `index.json`
 * manifest, so the picker browses all lessons without opening files one by one.
 * Mirrors the lesson-library folder pattern (handles.ts / IndexedDB), but reads
 * the manifest for its listing and opens a chosen lesson by its `file` name.
 */
import { ref } from 'vue'
import {
  pickDirectory,
  pickJsonFile,
  supportsDirectoryPicker,
  type DirectoryHandle,
} from './files'
import {
  rememberDirectory,
  listDirectories,
  removeEntry,
  ensurePermission,
  hasPermission,
  type HandleEntry,
} from './handles'
import { parseQuizLesson, parseQuizManifest, type QuizLesson, type QuizManifestEntry } from '@/dsl'

export function useQuizSource() {
  const dir = ref<HandleEntry | null>(null)
  const manifest = ref<QuizManifestEntry[]>([])
  const needsPermission = ref(false)
  const error = ref<string | null>(null)

  async function readManifest(handle: DirectoryHandle): Promise<QuizManifestEntry[]> {
    const file = await (await handle.getFileHandle('index.json')).getFile()
    return parseQuizManifest(await file.text()).lessons
  }

  /** Load the remembered quiz folder + manifest, or flag that it needs a click. */
  async function refresh() {
    error.value = null
    const entry = (await listDirectories('quiz'))[0] ?? null
    dir.value = entry
    manifest.value = []
    needsPermission.value = false
    if (!entry) return
    const handle = entry.handle as DirectoryHandle
    if (await hasPermission(handle, 'read')) {
      try {
        manifest.value = await readManifest(handle)
      } catch (e) {
        error.value = `Couldn't read index.json: ${e instanceof Error ? e.message : e}`
      }
    } else {
      needsPermission.value = true
    }
  }

  /** Pick a quiz folder to remember (user gesture → permission granted). */
  async function chooseFolder() {
    const handle = await pickDirectory()
    if (!handle) return
    await rememberDirectory(handle, 'quiz').catch(() => undefined)
    dir.value = (await listDirectories('quiz'))[0] ?? null
    needsPermission.value = false
    error.value = null
    try {
      manifest.value = await readManifest(handle)
    } catch (e) {
      error.value = `Couldn't read index.json in that folder: ${e instanceof Error ? e.message : e}`
      manifest.value = []
    }
  }

  /** Re-grant access after a reload dropped permission. */
  async function grant() {
    const entry = dir.value
    if (!entry) return
    const handle = entry.handle as DirectoryHandle
    if (await ensurePermission(handle, 'read')) {
      needsPermission.value = false
      await refresh()
    }
  }

  async function forget() {
    if (dir.value) await removeEntry(dir.value.key)
    dir.value = null
    manifest.value = []
    needsPermission.value = false
  }

  /** Open a manifest-listed lesson by its file name. */
  async function openLesson(entry: QuizManifestEntry): Promise<QuizLesson> {
    const handle = dir.value?.handle as DirectoryHandle | undefined
    if (!handle) throw new Error('no quiz folder')
    const file = await (await handle.getFileHandle(entry.file)).getFile()
    return parseQuizLesson(await file.text())
  }

  /** Open a single quiz `.json` (the no-folder path). */
  async function openSingleFile(): Promise<QuizLesson | null> {
    const file = await pickJsonFile()
    if (!file) return null
    return parseQuizLesson(file.text)
  }

  return {
    dir,
    manifest,
    needsPermission,
    error,
    supportsFolder: supportsDirectoryPicker,
    refresh,
    chooseFolder,
    grant,
    forget,
    openLesson,
    openSingleFile,
  }
}
