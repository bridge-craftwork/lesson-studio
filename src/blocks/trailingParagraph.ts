import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey } from '@milkdown/prose/state'

/**
 * Keep an empty paragraph at the end of the document whenever it would otherwise
 * end with a bridge block. Bridge blocks are atom nodes — you can't put the
 * caret inside or after one — so a block at the very end leaves nowhere to type
 * a following line, and a paste "at the end" lands on the block and replaces it.
 * A trailing paragraph gives an ordinary caret position there.
 *
 * Milkdown's markdown serializer drops a trailing empty paragraph, so this does
 * not change the saved file (verified: no dirty-on-load).
 */
export const trailingParagraph = $prose(
  () =>
    new Plugin({
      key: new PluginKey('trailingParagraph'),
      appendTransaction: (_trs, _oldState, state) => {
        const { doc, tr, schema } = state
        const last = doc.lastChild
        // Already fine if the doc ends in a textblock (paragraph, heading, …).
        if (!last || last.isTextblock) return null
        const paragraph = schema.nodes.paragraph
        if (!paragraph) return null
        return tr.insert(doc.content.size, paragraph.create())
      },
    }),
)
