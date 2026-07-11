// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { getMarkdown } from '@milkdown/utils'
import { handSchema } from './hand'

/**
 * The Contract 1 round-trip requirement, exercised through Milkdown's real
 * remark parser + serializer: markdown -> ProseMirror doc -> markdown must be
 * byte-identical for the `hand` block. Node views are irrelevant to
 * serialization, so only the schema is registered here — before commonmark, so
 * the `hand` parser wins over the generic code_block (registration order).
 *
 * Also returns whether the parsed doc actually contains a `hand` node, so the
 * test cannot pass trivially via code_block (which would also preserve the
 * ```hand fence).
 */
async function roundTrip(markdown: string): Promise<{ out: string; hasHandNode: boolean }> {
  const root = document.createElement('div')
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, markdown)
    })
    .use(handSchema)
    .use(commonmark)
    .create()
  const out = editor.action(getMarkdown())
  let hasHandNode = false
  editor.action((ctx) => {
    ctx.get(editorViewCtx).state.doc.descendants((node) => {
      if (node.type.name === 'hand') hasHandNode = true
    })
  })
  await editor.destroy()
  return { out, hasHandNode }
}

describe('hand block Milkdown round-trip', () => {
  it('preserves a hand block byte-for-byte via the hand node', async () => {
    const md = ['```hand', 'seat: S', 'S: A Q 5 4', 'H: K J 3', 'D: A 7 2', 'C: Q 8 5', '```'].join(
      '\n',
    )
    const { out, hasHandNode } = await roundTrip(md)
    expect(hasHandNode).toBe(true)
    expect(out.trim()).toBe(md)
  })

  it('preserves a hand block embedded in prose', async () => {
    const md = ['# Lesson', '', 'Consider:', '', '```hand', 'S: A K Q', 'H: -', 'D: -', 'C: -', '```'].join(
      '\n',
    )
    const { out, hasHandNode } = await roundTrip(md)
    expect(hasHandNode).toBe(true)
    expect(out.trim()).toBe(md)
  })
})
