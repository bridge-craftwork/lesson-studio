import type { NodeViewFactory } from '@prosemirror-adapter/vue'
import { handBlock } from './hand'

/**
 * All active bridge-block plugins, bound to the adapter's node-view factory.
 * Each new block (hands, auction, response-box, quiz, pagebreak) is added here
 * as it lands.
 */
export function bridgeBlocks(factory: NodeViewFactory) {
  return [...handBlock(factory)]
}
