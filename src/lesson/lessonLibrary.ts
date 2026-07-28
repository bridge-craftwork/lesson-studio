/**
 * List the lessons in a remembered lesson-library folder. The canonical layout
 * is `lessons/<slug>/<slug>.md` (Contract 4 / the lesson-library repo), so a
 * folder pointed at `lessons/` yields one entry per `<slug>` subfolder. A flat
 * folder of `.md` files also works, so pointing at a single lesson folder still
 * lists something.
 *
 * Deliberately cheap: it reads directory *entries* only, never file contents —
 * the Lobby shows slugs, and a file is read when you open it. That keeps a
 * Lobby visit from touching every lesson on disk.
 */
import type { DirectoryHandle, FileHandle } from './files'

export interface LibraryLesson {
  slug: string
  name: string
  fileHandle: FileHandle
}

const isMd = (name?: string): boolean => !!name && name.toLowerCase().endsWith('.md')
const stripMd = (name: string): string => name.replace(/\.md$/i, '')

export async function scanLibrary(dir: DirectoryHandle): Promise<LibraryLesson[]> {
  const lessons: LibraryLesson[] = []
  for await (const child of dir.values()) {
    if (child.kind === 'file' && isMd(child.name)) {
      const slug = stripMd(child.name!)
      lessons.push({ slug, name: slug, fileHandle: child as FileHandle })
    } else if (child.kind === 'directory') {
      const slug = child.name ?? ''
      const file = await pickLessonFile(child as DirectoryHandle, slug)
      if (file) lessons.push({ slug, name: slug, fileHandle: file })
    }
  }
  return lessons.sort((a, b) => a.slug.localeCompare(b.slug))
}

/** The `<slug>.md` inside a slug folder, or the first `.md` if it isn't named canonically. */
async function pickLessonFile(dir: DirectoryHandle, slug: string): Promise<FileHandle | null> {
  let firstMd: FileHandle | null = null
  for await (const child of dir.values()) {
    if (child.kind === 'file' && isMd(child.name)) {
      if (child.name === `${slug}.md`) return child as FileHandle
      firstMd ??= child as FileHandle
    }
  }
  return firstMd
}
