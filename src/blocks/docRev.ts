import { ref } from 'vue'

/**
 * A coarse "document structure changed" signal. Block node views compute some
 * things from the *whole* document — a quiz's ordinal number, the answer block's
 * collected answers — which a per-node reactive dep can't track when a *sibling*
 * changes. Bumping this on block insert / delete / source-edit lets those
 * computeds refresh in the live editor. (Print/preview mount fresh, so they're
 * always correct there regardless.)
 */
export const docRev = ref(0)
export const bumpDocRev = () => {
  docRev.value += 1
}
