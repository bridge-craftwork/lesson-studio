// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { getMarkdown } from '@milkdown/utils'
import { reservedBlockNode } from './reservedBlockNode'

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
const blockSchemas = (['hand', 'auction', 'quiz', 'answers', 'pagebreak', 'columnbreak', 'row'] as const).map(
  (t) => reservedBlockNode(t).schema,
)

async function roundTrip(
  markdown: string,
  expectNode = 'hand',
): Promise<{ out: string; hasNode: boolean }> {
  const root = document.createElement('div')
  const make = Editor.make().config((ctx) => {
    ctx.set(rootCtx, root)
    ctx.set(defaultValueCtx, markdown)
  })
  blockSchemas.forEach((s) => make.use(s))
  const editor = await make.use(commonmark).create()
  const out = editor.action(getMarkdown())
  let hasNode = false
  editor.action((ctx) => {
    ctx.get(editorViewCtx).state.doc.descendants((node) => {
      if (node.type.name === expectNode) hasNode = true
    })
  })
  await editor.destroy()
  return { out, hasNode }
}

describe('hand block Milkdown round-trip', () => {
  it('preserves a hand block byte-for-byte via the hand node', async () => {
    const md = ['```hand', 'seat: S', 'S: A Q 5 4', 'H: K J 3', 'D: A 7 2', 'C: Q 8 5', '```'].join(
      '\n',
    )
    const { out, hasNode } = await roundTrip(md)
    expect(hasNode).toBe(true)
    expect(out.trim()).toBe(md)
  })

  it('preserves a hand block embedded in prose', async () => {
    const md = ['# Lesson', '', 'Consider:', '', '```hand', 'S: A K Q', 'H: -', 'D: -', 'C: -', '```'].join(
      '\n',
    )
    const { out, hasNode } = await roundTrip(md)
    expect(hasNode).toBe(true)
    expect(out.trim()).toBe(md)
  })

  it('preserves an auction block (with notes) via the auction node', async () => {
    const md = ['```auction', 'dealer: N', '1C   P    1S   P', '1NT  P    2D^1  P', '2H', '---', '1. New Minor Forcing'].join('\n') + '\n```'
    const { out, hasNode } = await roundTrip(md, 'auction')
    expect(hasNode).toBe(true)
    expect(out.trim()).toBe(md)
  })

  it('preserves a quiz block (multi-line JSON body) via the quiz node', async () => {
    const json = JSON.stringify(
      {
        schema: 'quiz-embed/v1',
        source: { lesson_id: '1C_WalshStyle' },
        exercise: {
          id: '1C_WalshStyle-1',
          type: 'bidding',
          title: 'Exercise One',
          prompt: 'Partner opens 1♣. What do you bid?',
          questions: [{ hand: { spades: '754', hearts: 'K874', diamonds: 'AK65', clubs: 'A2' }, answer: '1D' }],
        },
      },
      null,
      2,
    )
    const md = '```quiz\n' + json + '\n```'
    const { out, hasNode } = await roundTrip(md, 'quiz')
    expect(hasNode).toBe(true)
    expect(out.trim()).toBe(md)
  })

  it('preserves an answers block (with a columns setting)', async () => {
    const md = ['```answers', 'columns: 2', '```'].join('\n')
    const { out, hasNode } = await roundTrip(md, 'answers')
    expect(hasNode).toBe(true)
    expect(out.trim()).toBe(md)
  })

  it('preserves an empty pagebreak block', async () => {
    const md = ['```pagebreak', '```'].join('\n')
    const { out, hasNode } = await roundTrip(md, 'pagebreak')
    expect(hasNode).toBe(true)
    expect(out.trim()).toBe(md)
  })

  it('preserves an empty columnbreak block', async () => {
    const md = ['```columnbreak', '```'].join('\n')
    const { out, hasNode } = await roundTrip(md, 'columnbreak')
    expect(hasNode).toBe(true)
    expect(out.trim()).toBe(md)
  })

  it('preserves a row block with a nested hand (four-backtick fence)', async () => {
    const md = [
      '````row',
      'Lead-in text.',
      '',
      '```hand',
      'S: A K Q',
      'H: -',
      'D: -',
      'C: -',
      '```',
      '````',
    ].join('\n')
    const { out, hasNode } = await roundTrip(md, 'row')
    expect(hasNode).toBe(true)
    expect(out.trim()).toBe(md)
  })
})
