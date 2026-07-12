import { $prose } from '@milkdown/utils'
import { Plugin } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'
import { RED_SUIT_RE } from '@/dsl'

/**
 * Colors literal red-suit glyphs (♥/♦) in prose red, in both the editor and the
 * read-only print view. A view-only inline decoration — it never touches the
 * document, so the markdown round-trip is unaffected. Blocks render their own
 * suit coloring via the components; this covers glyphs authors type in text.
 */
export const suitColoring = $prose(
  () =>
    new Plugin({
      props: {
        decorations(state) {
          const decorations: Decoration[] = []
          state.doc.descendants((node, pos) => {
            if (!node.isText || !node.text) return
            const text = node.text
            RED_SUIT_RE.lastIndex = 0
            let match: RegExpExecArray | null
            while ((match = RED_SUIT_RE.exec(text)) !== null) {
              const from = pos + match.index
              decorations.push(Decoration.inline(from, from + 1, { style: 'color: #d32f2f' }))
            }
          })
          return DecorationSet.create(state.doc, decorations)
        },
      },
    }),
)
