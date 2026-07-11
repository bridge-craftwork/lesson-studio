<script setup lang="ts">
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { Milkdown, useEditor } from '@milkdown/vue'
import { useNodeViewFactory } from '@prosemirror-adapter/vue'
import { bridgeBlocks } from '../blocks'

const props = defineProps<{ initialMarkdown?: string }>()

// The adapter factory turns Vue components into ProseMirror node views. It must
// be resolved under a ProsemirrorAdapterProvider (see LessonEditor.vue).
const nodeViewFactory = useNodeViewFactory()

// Phase 1: CommonMark round-trip via remark, plus the reserved bridge blocks
// (Contract 1) as custom nodes with live Vue node views. Blocks are added in
// src/blocks/ and registered here as they land.
useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, props.initialMarkdown ?? '')
    })
    // Bridge blocks are registered BEFORE commonmark so their parseMarkdown
    // matchers (e.g. code[lang=hand]) take precedence over the generic
    // code_block — Milkdown's parser matches node specs in registration order.
    .use(bridgeBlocks(nodeViewFactory))
    .use(commonmark),
)
</script>

<template>
  <Milkdown />
</template>
