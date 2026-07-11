/**
 * Lesson file I/O. Uses the File System Access API (Chromium) for real
 * open/save against `.md` files on disk, with an upload/download fallback for
 * browsers that lack it (Firefox/Safari).
 */

// Minimal shape of a File System Access handle (avoids a types dependency).
export interface FileHandle {
  name?: string
  getFile(): Promise<File>
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>
}

export interface OpenedFile {
  name: string
  text: string
  handle: FileHandle | null
}

const MD_TYPES = [{ description: 'Markdown lesson', accept: { 'text/markdown': ['.md'] } }]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const w = window as any

export const supportsFsAccess = typeof w.showOpenFilePicker === 'function'

export async function openLessonFile(): Promise<OpenedFile | null> {
  if (supportsFsAccess) {
    try {
      const [handle] = await w.showOpenFilePicker({ types: MD_TYPES })
      const file = await handle.getFile()
      return { name: file.name, text: await file.text(), handle }
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return null
      throw err
    }
  }
  return openViaInput()
}

function openViaInput(): Promise<OpenedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,text/markdown'
    input.onchange = async () => {
      const file = input.files?.[0]
      resolve(file ? { name: file.name, text: await file.text(), handle: null } : null)
    }
    input.click()
  })
}

export async function saveToHandle(handle: FileHandle, text: string): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(text)
  await writable.close()
}

/** Save-as: returns the new handle (FS Access) or null (download fallback). */
export async function saveLessonAs(text: string, suggestedName: string): Promise<FileHandle | null> {
  if (supportsFsAccess && typeof w.showSaveFilePicker === 'function') {
    try {
      const handle: FileHandle = await w.showSaveFilePicker({ suggestedName, types: MD_TYPES })
      await saveToHandle(handle, text)
      return handle
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return null
      throw err
    }
  }
  download(text, suggestedName)
  return null
}

function download(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
