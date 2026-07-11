<script setup lang="ts">
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { Milkdown, useEditor } from '@milkdown/vue'

const props = defineProps<{ initialMarkdown?: string }>()

// Phase 1 baseline: CommonMark round-trip via remark. The reserved bridge
// blocks (Contract 1: hand, hands, auction, response-box, quiz) are added as
// custom node-view plugins in src/blocks/ and registered here as they land.
useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, props.initialMarkdown ?? '')
    })
    .use(commonmark),
)
</script>

<template>
  <Milkdown />
</template>
