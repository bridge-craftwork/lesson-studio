/**
 * Lesson templates — skeletons you start a new lesson *from*, surfaced in the
 * Lobby. The architecture's "template starter" plugin lives here rather than as
 * the app's implicit default document: a template must read as a template, not
 * masquerade as saved content (that confusion is exactly what the Lobby fixes).
 *
 * `markdown` is seeded into a fresh draft on selection; each template's `name`
 * and `blurb` are Lobby-facing, never written into the lesson.
 */
import { STARTER_LESSON } from '../editor/starter'

export interface Template {
  id: string
  name: string
  blurb: string
  markdown: string
}

const BLANK_LESSON = `---
title: Untitled lesson
skill_paths: []
level: intermediate
author: Your Name
status: draft
reviewed-by: self
---

Start writing. Use the ribbon to insert hands, auctions and response boxes.
`

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank lesson',
    blurb: 'Front matter and an empty body — start from nothing.',
    markdown: BLANK_LESSON,
  },
  {
    id: 'topic-intro',
    name: 'Topic introduction',
    blurb: 'A worked convention page: hand, auction and response box (NMF example).',
    markdown: STARTER_LESSON,
  },
]

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id)
}
