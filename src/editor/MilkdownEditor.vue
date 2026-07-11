<script setup lang="ts">
import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { Milkdown, useEditor } from '@milkdown/vue'
import { useNodeViewFactory } from '@prosemirror-adapter/vue'
import { bridgeBlocks } from '../blocks'

const props = withDefaults(
  defineProps<{ initialMarkdown?: string; editable?: boolean }>(),
  { editable: true },
)

// The adapter factory turns Vue components into ProseMirror node views. It must
// be resolved under a ProsemirrorAdapterProvider (see LessonDocument.vue).
const nodeViewFactory = useNodeViewFactory()

// Phase 1: CommonMark round-trip via remark, plus the reserved bridge blocks
// (Contract 1) as custom nodes with live Vue node views. The same surface
// renders read-only for the print view (editable: false).
useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, props.initialMarkdown ?? '')
      ctx.update(editorViewOptionsCtx, (prev) => ({
        ...prev,
        editable: () => props.editable,
      }))
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
