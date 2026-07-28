// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { readSession, writeSession } from './sessionStore'
import { listHistory } from './history'
import { upsertDraft } from './drafts'
import { TEMPLATES, getTemplate } from './templates'
import { STARTER_LESSON } from '../editor/starter'

beforeEach(() => localStorage.clear())

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
