import { $node, $view } from '@milkdown/utils'
import type { NodeViewFactory } from '@prosemirror-adapter/vue'
import type { ReservedBlock } from '@/dsl'
import BlockNodeView from './BlockNodeView.vue'

/**
 * Build a Milkdown node + Vue node view for a reserved DSL block (Contract 1),
 * parameterized by tag.
 *
 * Round-trip: a remark `code` node with info string `<tag>` maps to an atom
 * prose node holding the block body verbatim in `attrs.body`, and serializes
 * straight back — so every block round-trips losslessly through Milkdown's
 * markdown. Registered before commonmark so `code[lang=<tag>]` matches here
 * first rather than falling through to the generic code_block (the parser
 * matches specs in registration order; `priority` does not apply to markdown
 * parsing). The node view renders the shared read-only BlockView, the same
 * render path the gallery and print view use.
 */
export function reservedBlockNode(tag: ReservedBlock) {
  const schema = $node(tag, () => ({
    group: 'block',
    atom: true,
    isolating: true,
    selectable: true,
    marks: '',
    priority: 100,
    attrs: { body: { default: '' } },
    parseDOM: [
      {
        tag: `div[data-block="${tag}"]`,
        getAttrs: (dom) => ({ body: (dom as HTMLElement).getAttribute('data-body') ?? '' }),
      },
    ],
    toDOM: (node) => ['div', { 'data-block': tag, 'data-body': node.attrs.body as string }],
    parseMarkdown: {
      match: (node) => node.type === 'code' && node.lang === tag,
      runner: (state, node, type) => {
        state.addNode(type, { body: (node.value as string) ?? '' })
      },
    },
    toMarkdown: {
      match: (node) => node.type.name === tag,
      runner: (state, node) => {
        state.addNode('code', undefined, (node.attrs.body as string) ?? '', { lang: tag })
      },
    },
  }))

  const view = (factory: NodeViewFactory) =>
    $view(schema, () =>
      factory({
        component: BlockNodeView,
        as: 'div',
        // Let the source-edit textarea handle its own keys/selection; without
        // this ProseMirror swallows typing inside the node view.
        stopEvent: (event: Event) => {
          const target = event.target as HTMLElement | null
          return Boolean(target?.closest?.('[data-block-source]'))
        },
      }),
    )

  return { schema, view }
}
