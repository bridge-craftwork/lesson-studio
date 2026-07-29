/**
 * IndexedDB persistence for File System Access handles — the piece that lets a
 * file survive a reload. localStorage can't hold a handle (it isn't a string),
 * but IDB stores structured-cloneable objects, and FS Access handles are.
 *
 * One store, `entries`, backs three Lobby surfaces: Recent files (Phase B),
 * disk Favorites, and the remembered lesson-library directory (Phase C). Each
 * record carries the live handle plus display metadata, so the Lobby can list
 * files without re-picking them — re-granting permission (a user-gesture-gated
 * step) happens when you actually open one.
 */
import type { DirectoryHandle, FileHandle, PermissionMode } from './files'

const DB_NAME = 'lesson-studio'
const DB_VERSION = 1
const STORE = 'entries'

/** What a remembered directory is for — keeps the lesson-library folder and the
 *  PBS quiz folder from colliding in the one store. Undefined reads as 'library'
 *  (the only role before quiz folders existed). */
export type DirectoryRole = 'library' | 'quiz'

export interface HandleEntry {
  /** App-generated stable id (keyPath). */
  key: string
  name: string
  kind: 'file' | 'directory'
  handle: FileHandle | DirectoryHandle
  lastOpened: number
  favorite: boolean
  /** For directories: which surface it backs (default 'library'). */
  role?: DirectoryRole
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const store = db.transaction(STORE, mode).objectStore(STORE)
        const req = run(store)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

/** Whether persisted handles are usable at all (needs both APIs). */
export const supportsHandleStore =
  typeof indexedDB !== 'undefined' && typeof (globalThis as { FileSystemHandle?: unknown }).FileSystemHandle !== 'undefined'

export function listEntries(): Promise<HandleEntry[]> {
  return tx<HandleEntry[]>('readonly', (s) => s.getAll() as IDBRequest<HandleEntry[]>).catch(() => [])
}

export function getEntry(key: string): Promise<HandleEntry | undefined> {
  return tx<HandleEntry | undefined>('readonly', (s) => s.get(key) as IDBRequest<HandleEntry | undefined>).catch(
    () => undefined,
  )
}

export function removeEntry(key: string): Promise<void> {
  return tx('readwrite', (s) => s.delete(key)).then(() => undefined)
}

function putEntry(entry: HandleEntry): Promise<void> {
  return tx('readwrite', (s) => s.put(entry)).then(() => undefined)
}

/**
 * Record a just-opened file, deduped by identity so re-opening the same file
 * touches one record rather than accumulating. Returns the stable key, which
 * the session stores so a reload can re-link the handle.
 */
export async function rememberFile(handle: FileHandle): Promise<string> {
  const existing = await findByIdentity(handle)
  const key = existing?.key ?? crypto.randomUUID()
  await putEntry({
    key,
    name: handle.name ?? existing?.name ?? 'untitled.md',
    kind: 'file',
    handle,
    lastOpened: Date.now(),
    favorite: existing?.favorite ?? false,
  })
  return key
}

/**
 * Remember a directory (a lesson-library `lessons/` folder, or a PBS `quiz/`
 * folder) so its lessons can be listed across reloads. Deduped by identity;
 * `role` keeps the two folders from colliding.
 */
export async function rememberDirectory(handle: DirectoryHandle, role: DirectoryRole = 'library'): Promise<string> {
  const existing = await findByIdentity(handle, 'directory')
  const key = existing?.key ?? crypto.randomUUID()
  await putEntry({
    key,
    name: handle.name ?? existing?.name ?? 'lessons',
    kind: 'directory',
    handle,
    lastOpened: Date.now(),
    favorite: existing?.favorite ?? false,
    role,
  })
  return key
}

/** Find a stored entry of the given kind that points at the same on-disk item. */
async function findByIdentity(
  handle: FileHandle | DirectoryHandle,
  kind: 'file' | 'directory' = 'file',
): Promise<HandleEntry | undefined> {
  if (typeof handle.isSameEntry !== 'function') return undefined
  const entries = (await listEntries()).filter((e) => e.kind === kind)
  for (const entry of entries) {
    try {
      // Same-kind handles share the isSameEntry signature; the cast bridges the
      // File/Directory union without widening the public types.
      if (await (entry.handle as FileHandle).isSameEntry?.(handle as FileHandle)) return entry
    } catch {
      /* a dead handle can't match; skip it */
    }
  }
  return undefined
}

export function listFiles(): Promise<HandleEntry[]> {
  return listEntries().then((es) => es.filter((e) => e.kind === 'file'))
}

export function listFavorites(): Promise<HandleEntry[]> {
  return listFiles().then((es) => es.filter((e) => e.favorite).sort((a, b) => b.lastOpened - a.lastOpened))
}

export function listDirectories(role: DirectoryRole = 'library'): Promise<HandleEntry[]> {
  return listEntries().then((es) => es.filter((e) => e.kind === 'directory' && (e.role ?? 'library') === role))
}

export async function setFavorite(key: string, favorite: boolean): Promise<void> {
  const entry = await getEntry(key)
  if (entry) await putEntry({ ...entry, favorite })
}

/**
 * Ensure the handle still has permission, re-requesting if the browser dropped
 * it on reload. MUST be called from a user gesture (a click) — the browser
 * rejects `requestPermission` otherwise. Returns true if granted.
 */
export async function ensurePermission(
  handle: FileHandle | DirectoryHandle,
  mode: PermissionMode = 'read',
): Promise<boolean> {
  if (typeof handle.queryPermission !== 'function') return true // fallback handles need none
  const desc = { mode }
  if ((await handle.queryPermission(desc)) === 'granted') return true
  return (await handle.requestPermission?.(desc)) === 'granted'
}

/**
 * Query permission WITHOUT requesting — safe to call outside a user gesture
 * (e.g. at mount, to decide whether a remembered directory can be scanned yet
 * or needs a "grant access" click first).
 */
export async function hasPermission(
  handle: FileHandle | DirectoryHandle,
  mode: PermissionMode = 'read',
): Promise<boolean> {
  if (typeof handle.queryPermission !== 'function') return true
  return (await handle.queryPermission({ mode })) === 'granted'
}
