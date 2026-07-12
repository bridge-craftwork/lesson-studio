<script setup lang="ts">
import { computed } from 'vue'
import { useNodeViewContext } from '@prosemirror-adapter/vue'
import BlockView from '../render/BlockView.vue'
import type { ReservedBlock } from '@/dsl'

// Generic node view for every reserved DSL block: read the tag from the node
// type and the body from attrs, then render the shared read-only BlockView.
const { node, selected } = useNodeViewContext()

const tag = computed(() => node.value.type.name as ReservedBlock)
const body = computed(() => (node.value.attrs.body as string) ?? '')
</script>

<template>
  <div class="reserved-block" :class="[`reserved-block--${tag}`, { 'is-selected': selected }]" contenteditable="false">
    <BlockView :tag="tag" :body="body" />
  </div>
</template>

<style scoped>
.reserved-block {
  margin: 0.5rem 0;
  padding: 0.25rem;
  border-radius: 8px;
}
.reserved-block.is-selected {
  outline: 2px solid var(--ls-accent, #1d4ed8);
}
</style>
