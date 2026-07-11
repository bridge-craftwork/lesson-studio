import { $node, $view } from '@milkdown/utils'
import type { NodeViewFactory } from '@prosemirror-adapter/vue'
import HandBlockView from './HandBlockView.vue'

/**
 * Contract 1 `hand` block as a Milkdown node.
 *
 * Round-trip: a remark `code` node with info string `hand` maps to an atom
 * prose node carrying the block body verbatim in `attrs.body`, and serializes
 * straight back to the same fenced code node — so the block round-trips
 * losslessly through Milkdown's markdown (the Contract 1 requirement). The
 * body's *canonical form* is enforced separately by the `hand-block` formatter.
 */
export const handSchema = $node('hand', () => ({
  group: 'block',
  atom: true,
  isolating: true,
  selectable: true,
  marks: '',
  // Priority above the commonmark code_block so `code[lang=hand]` matches here
  // first rather than falling through to a generic code block.
  priority: 100,
  attrs: { body: { default: '' } },
  parseDOM: [
    {
      tag: 'div[data-block="hand"]',
      getAttrs: (dom) => ({ body: (dom as HTMLElement).getAttribute('data-body') ?? '' }),
    },
  ],
  toDOM: (node) => [
    'div',
    { 'data-block': 'hand', 'data-body': node.attrs.body as string },
  ],
  parseMarkdown: {
    match: (node) => node.type === 'code' && node.lang === 'hand',
    runner: (state, node, type) => {
      state.addNode(type, { body: (node.value as string) ?? '' })
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'hand',
    runner: (state, node) => {
      state.addNode('code', undefined, (node.attrs.body as string) ?? '', { lang: 'hand' })
    },
  },
}))

/** Bind the `hand` node to its Vue node view via the adapter factory. */
export function handView(factory: NodeViewFactory) {
  return $view(handSchema, () =>
    factory({
      component: HandBlockView,
      as: 'div',
      stopEvent: () => false,
    }),
  )
}

/** The `hand` block plugin bundle: schema + node view. */
export function handBlock(factory: NodeViewFactory) {
  return [handSchema, handView(factory)]
}
