// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { Editor, rootCtx, editorViewCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { getMarkdown } from '@milkdown/utils'
import { convertSuitEscapes, suitEscapeInput } from './suitEscapes'

describe('convertSuitEscapes (paste / plain-text path)', () => {
  it('is case-insensitive', () => {
    expect(convertSuitEscapes('\\C \\D \\H \\S')).toBe('♣ ♦ ♥ ♠')
    expect(convertSuitEscapes('\\c \\d \\h \\s')).toBe('♣ ♦ ♥ ♠')
  })
})

/**
 * Drive the real Milkdown editor + the suit-escape input rule, simulating typing
 * the letter after a backslash. Proves the prose conversion fires for BOTH
 * cases — `\S` must become ♠ exactly like `\s`.
 */
async function typeEscape(letter: string): Promise<string> {
  const root = document.createElement('div')
  const editor = await Editor.make()
    .config((ctx) => ctx.set(rootCtx, root))
    .use(suitEscapeInput)
    .use(commonmark)
    .create()

  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    // Put a backslash in the first paragraph, cursor after it.
    view.dispatch(view.state.tr.insertText('\\', 1))
    const pos = view.state.selection.from
    // Simulate typing `letter` there — the inputrules plugin's handleTextInput
    // is exactly what a keystroke triggers. Cast: the bundled prop type carries
    // an extra optional arg the runtime doesn't require.
    view.someProp('handleTextInput', (f) => (f as (...a: unknown[]) => boolean)(view, pos, pos, letter))
  })

  const out = editor.action(getMarkdown())
  await editor.destroy()
  return out.trim()
}

describe('suit-escape input rule (prose, as-you-type)', () => {
  it('converts lowercase \\s to ♠', async () => {
    expect(await typeEscape('s')).toBe('♠')
  })
  it('converts UPPERCASE \\S to ♠', async () => {
    expect(await typeEscape('S')).toBe('♠')
  })
  it('converts \\H and \\h to ♥', async () => {
    expect(await typeEscape('H')).toBe('♥')
    expect(await typeEscape('h')).toBe('♥')
  })
})
