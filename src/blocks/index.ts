import type { NodeViewFactory } from '@prosemirror-adapter/vue'
import { V1_ACTIVE_BLOCKS } from '@/dsl'
import { reservedBlockNode } from './reservedBlockNode'

/**
 * All active bridge-block plugins (Contract 1 v1 vocabulary), each a Milkdown
 * node + Vue node view bound to the adapter factory. Registered before
 * commonmark by the editor so their parseMarkdown matchers win.
 */
export function bridgeBlocks(factory: NodeViewFactory) {
  return V1_ACTIVE_BLOCKS.flatMap((tag) => {
    const { schema, view } = reservedBlockNode(tag)
    return [schema, view(factory)]
  })
}
