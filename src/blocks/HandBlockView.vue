<script setup lang="ts">
import { computed } from 'vue'
import { useNodeViewContext } from '@prosemirror-adapter/vue'
import { HandDisplay } from '@bridge-craftwork/bridge-components'
import { parseHandBlock, toComponentHand } from '@/dsl'

// Live node view for the `hand` block. Reads the block body from the node's
// attrs, parses it (Contract 1), adapts the wire hand to the component array
// form (Contract 2 adapter), and renders the shared HandDisplay component.
const { node, selected } = useNodeViewContext()

const parsed = computed(() => {
  const body = (node.value.attrs.body as string) ?? ''
  try {
    return parseHandBlock(body)
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
})

const isValid = computed(() => parsed.value !== null && !('error' in parsed.value))
</script>

<template>
  <div class="hand-block" :class="{ 'is-selected': selected }" contenteditable="false">
    <template v-if="isValid">
      <HandDisplay :hand="toComponentHand((parsed as any).hand)" :show-hcp="true" />
      <div v-if="(parsed as any).label || (parsed as any).seat" class="hand-block__label">
        {{ (parsed as any).label ?? (parsed as any).seat }}
      </div>
    </template>
    <div v-else class="hand-block__error">
      Invalid hand block: {{ (parsed as any).error }}
    </div>
  </div>
</template>

<style scoped>
.hand-block {
  display: inline-flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0.5rem 0;
  padding: 0.25rem;
  border-radius: 8px;
}
.hand-block.is-selected {
  outline: 2px solid var(--ls-accent, #1d4ed8);
}
.hand-block__label {
  font-size: 0.75rem;
  color: var(--ls-muted, #666);
  text-align: center;
}
.hand-block__error {
  font-family: var(--ls-mono, monospace);
  font-size: 0.8rem;
  color: #c81e1e;
  padding: 0.5rem;
  border: 1px dashed #c81e1e;
  border-radius: 6px;
}
</style>
