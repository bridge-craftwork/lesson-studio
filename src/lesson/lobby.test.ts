// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { readSession, writeSession } from './sessionStore'
import { listHistory, listHistoryGroups } from './history'
import { upsertDraft } from './drafts'
import { TEMPLATES, getTemplate } from './templates'
import { scanLibrary } from './lessonLibrary'
import type { DirectoryHandle, FileHandle } from './files'
import { STARTER_LESSON } from '../editor/starter'

beforeEach(() => localStorage.clear())

// Minimal stand-ins for File System Access handles: just a kind, a name, and
// (for directories) an async-iterable `values()`.
function mkFile(name: string): FileHandle {
  return { kind: 'file', name } as unknown as FileHandle
}
function mkDir(name: string, children: Array<FileHandle | DirectoryHandle>): DirectoryHandle {
  return {
    kind: 'directory',
    name,
    async *values() {
      for (const c of children) yield c
    },
  } as unknown as DirectoryHandle
}

describe('sessionStore — last-location memory', () => {
  it('defaults to the Lobby when nothing is stored', () => {
    expect(readSession()).toEqual({ location: 'lobby' })
  })

  it('round-trips an open document', () => {
    writeSession({ location: 'document', draftId: 'abc', handleKey: 'k1', fileName: 'x.md' })
    expect(readSession()).toEqual({
      location: 'document',
      draftId: 'abc',
      handleKey: 'k1',
      fileName: 'x.md',
    })
  })

  it('falls back to the Lobby on corrupt state', () => {
    localStorage.setItem('lesson-studio:session:v1', '{not json')
    expect(readSession()).toEqual({ location: 'lobby' })
  })

  it('treats a non-document location as the Lobby', () => {
    localStorage.setItem('lesson-studio:session:v1', JSON.stringify({ location: 'nonsense' }))
    expect(readSession()).toEqual({ location: 'lobby' })
  })
})

describe('history — merged, newest-first, tagged by kind', () => {
  it('tags a handle-backed draft as a file and a plain draft as a draft', () => {
    upsertDraft({ id: 'plain', title: 'Plain', markdown: 'a', updatedAt: 1000 })
    upsertDraft({ id: 'filed', title: 'Filed', markdown: 'b', updatedAt: 2000, handleKey: 'k' })

    const history = listHistory()
    expect(history.map((e) => [e.title, e.kind])).toEqual([
      ['Filed', 'file'], // newer first
      ['Plain', 'draft'],
    ])
    expect(history[0].handleKey).toBe('k')
    expect(history[0].draftId).toBe('filed')
  })
})

describe('history grouping — one row per document, older drafts tucked away', () => {
  it('groups repeat opens of one file (same handleKey), newest as primary', () => {
    upsertDraft({ id: 'v1', title: 'NMF', markdown: 'a', updatedAt: 1000, handleKey: 'k' })
    upsertDraft({ id: 'v2', title: 'NMF (edited)', markdown: 'b', updatedAt: 3000, handleKey: 'k' })
    upsertDraft({ id: 'v3', title: 'NMF', markdown: 'c', updatedAt: 2000, handleKey: 'k' })

    const groups = listHistoryGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0].primary.draftId).toBe('v2') // newest
    expect(groups[0].older.map((e) => e.draftId)).toEqual(['v3', 'v1']) // newest-first
  })

  it('groups repeat template starts by title, but keeps distinct titles apart', () => {
    upsertDraft({ id: 'a1', title: 'Stayman', markdown: 'a', updatedAt: 1000 })
    upsertDraft({ id: 'a2', title: 'Stayman', markdown: 'b', updatedAt: 2000 })
    upsertDraft({ id: 'b1', title: 'Jacoby', markdown: 'c', updatedAt: 1500 })

    const groups = listHistoryGroups()
    expect(groups.map((g) => g.primary.title)).toEqual(['Stayman', 'Jacoby']) // by primary time desc
    const stayman = groups.find((g) => g.primary.title === 'Stayman')!
    expect(stayman.primary.draftId).toBe('a2')
    expect(stayman.older.map((e) => e.draftId)).toEqual(['a1'])
    expect(groups.find((g) => g.primary.title === 'Jacoby')!.older).toEqual([])
  })

  it('does not merge distinct untitled draft-only documents', () => {
    upsertDraft({ id: 'u1', title: '', markdown: 'a', updatedAt: 1000 })
    upsertDraft({ id: 'u2', title: '', markdown: 'b', updatedAt: 2000 })
    expect(listHistoryGroups()).toHaveLength(2)
  })
})

describe('scanLibrary — lesson-library folder listing', () => {
  it('lists lessons/<slug>/<slug>.md, sorted, preferring the canonical file', async () => {
    const dir = mkDir('lessons', [
      mkDir('stayman', [mkFile('notes.md'), mkFile('stayman.md')]), // canonical wins over first
      mkDir('new-minor-forcing', [mkFile('new-minor-forcing.md')]),
      mkDir('empty', []), // no .md → skipped
    ])
    const lessons = await scanLibrary(dir)
    expect(lessons.map((l) => l.slug)).toEqual(['new-minor-forcing', 'stayman'])
    expect(lessons.find((l) => l.slug === 'stayman')?.fileHandle.name).toBe('stayman.md')
  })

  it('handles a flat folder of .md files and ignores non-markdown', async () => {
    const dir = mkDir('lessons', [mkFile('a.md'), mkFile('README.txt'), mkFile('b.md')])
    const lessons = await scanLibrary(dir)
    expect(lessons.map((l) => l.slug)).toEqual(['a', 'b'])
  })

  it('falls back to the first .md when no file matches the slug', async () => {
    const dir = mkDir('lessons', [mkDir('twoclub', [mkFile('lesson.md')])])
    const lessons = await scanLibrary(dir)
    expect(lessons.map((l) => l.slug)).toEqual(['twoclub'])
    expect(lessons[0].fileHandle.name).toBe('lesson.md')
  })
})

describe('templates', () => {
  it('exposes the topic-intro template seeded from the starter lesson', () => {
    const topic = getTemplate('topic-intro')
    expect(topic?.markdown).toBe(STARTER_LESSON)
  })

  it('includes a blank template and every template carries display metadata', () => {
    expect(getTemplate('blank')).toBeTruthy()
    for (const t of TEMPLATES) {
      expect(t.name).toBeTruthy()
      expect(t.blurb).toBeTruthy()
      expect(t.markdown).toContain('title:')
    }
  })
})
