import { $inputRule, $prose } from '@milkdown/utils'
import { InputRule } from '@milkdown/prose/inputrules'
import { Plugin } from '@milkdown/prose/state'

/**
 * BridgeComposer-style suit shorthand in prose: `\C \D \H \S` become ♣ ♦ ♥ ♠ as
 * you type. Suit symbols are used constantly in bridge text, and this is far
 * faster than a picker or the OS symbol palette.
 *
 * The shorthand converts to the real Unicode glyph — the stored markdown holds
 * ♣, not `\C` — so it round-trips as ordinary text and the existing suit
 * coloring (`suitColoring`) reddens ♥/♦ without more work. CommonMark leaves a
 * backslash-before-a-letter literal, so `\C` survives parsing intact until the
 * rule fires; nothing in the markdown pipeline fights it.
 */
const GLYPH: Record<string, string> = { c: '♣', d: '♦', h: '♥', s: '♠' }
const ESC = /\\([cdhsCDHS])/g

/** Type `\c`…`\s` (either case) → the suit glyph, as the letter is typed. */
export const suitEscapeInput = $inputRule(
  () =>
    new InputRule(/\\([cdhsCDHS])$/, (state, match, start, end) => {
      const glyph = GLYPH[match[1].toLowerCase()]
      return glyph ? state.tr.insertText(glyph, start, end) : null
    }),
)

/** Paste transform: BridgeComposer text pasted with `\C` etc. converts too. */
export const suitEscapePaste = $prose(
  () =>
    new Plugin({
      props: {
        transformPastedText(text) {
          return text.replace(ESC, (_, l: string) => GLYPH[l.toLowerCase()])
        },
      },
    }),
)

/** Convert every `\C`-style escape in a string to its glyph (for plain inputs). */
export function convertSuitEscapes(text: string): string {
  return text.replace(ESC, (_, l: string) => GLYPH[l.toLowerCase()])
}
