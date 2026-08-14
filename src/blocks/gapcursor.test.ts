// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { GapCursor } from '@milkdown/prose/gapcursor'
import { NodeSelection } from '@milkdown/prose/state'
import type { ResolvedPos } from '@milkdown/prose/model'
import { createParagraphNear } from '@milkdown/prose/commands'
import { reservedBlockNode } from './reservedBlockNode'

/**
 * Two bridge blocks in a row leave nowhere to type between them — both are atom
 * nodes, so the only caret position there is a *gap cursor*. That plugin was
 * installed but silently inert, because `GapCursor.valid()` finishes by asking
 * whether the parent's `defaultType` is a textblock, and the doc's defaultType
 * was `hand`: bridge blocks are registered before commonmark, so they come
 * first in the schema, and a type only drops out of that race if it has
 * required attrs. Hence `body` carries no default (see reservedBlockNode.ts).
 *
 * These tests pin the invariant, which is invisible in code review and easy to
 * undo by "tidying" a default back onto the attr.
 */
const blockSchemas = (['hand', 'hands', 'auction', 'columnbreak', 'pagebreak'] as const).map(
  (t) => reservedBlockNode(t).schema,
)

// `GapCursor.valid` is a real static, but prosemirror-gapcursor's .d.ts doesn't
// declare it — this test exists precisely to check what that static returns.
const gapCursorValid = (GapCursor as unknown as { valid($pos: ResolvedPos): boolean }).valid

async function editorWith(markdown: string) {
  const root = document.createElement('div')
  const make = Editor.make().config((ctx) => {
    ctx.set(rootCtx, root)
    ctx.set(defaultValueCtx, markdown)
  })
  blockSchemas.forEach((s) => make.use(s))
  return make.use(commonmark).create()
}

const TWO_BLOCKS =
  'Intro.\n\n```hands\nlayout: NS\nN: H:K J 4 2\nS: H:Q T 5 3\n```\n\n```columnbreak\n```\n\nAfter.\n'

describe('a caret between two adjacent bridge blocks', () => {
  it('keeps the document default type a textblock, not a bridge block', async () => {
    const editor = await editorWith(TWO_BLOCKS)
    editor.action((ctx) => {
      const { doc } = ctx.get(editorViewCtx).state
      const deflt = doc.contentMatchAt(0).defaultType
      expect(deflt?.name).toBe('paragraph')
      expect(deflt?.isTextblock).toBe(true)
    })
  })

  it('allows a gap cursor between the two blocks', async () => {
    const editor = await editorWith(TWO_BLOCKS)
    editor.action((ctx) => {
      const { doc } = ctx.get(editorViewCtx).state
      let between = -1
      doc.forEach((node, offset) => {
        if (node.type.name === 'hands') between = offset + node.nodeSize
      })
      expect(between).toBeGreaterThan(-1)
      expect(gapCursorValid(doc.resolve(between))).toBe(true)
    })
  })

  it('lets Enter make a paragraph after a selected block', async () => {
    const editor = await editorWith(TWO_BLOCKS)
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      let handsPos = -1
      view.state.doc.forEach((node, offset) => {
        if (node.type.name === 'hands') handsPos = offset
      })
      const state = view.state.apply(
        view.state.tr.setSelection(NodeSelection.create(view.state.doc, handsPos)),
      )
      let created: string | null = null
      createParagraphNear(state, (tr) => {
        created = tr.doc.child(2).type.name
      })
      expect(created).toBe('paragraph')
    })
  })

  it('still round-trips both blocks unchanged', async () => {
    // The attr change must not disturb serialization.
    const editor = await editorWith(TWO_BLOCKS)
    editor.action((ctx) => {
      const kinds: string[] = []
      ctx.get(editorViewCtx).state.doc.forEach((n) => kinds.push(n.type.name))
      expect(kinds).toEqual(['paragraph', 'hands', 'columnbreak', 'paragraph'])
    })
  })
})
