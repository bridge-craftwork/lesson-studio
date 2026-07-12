<script setup lang="ts">
import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { Milkdown, useEditor } from '@milkdown/vue'
import { useNodeViewFactory } from '@prosemirror-adapter/vue'
import { bridgeBlocks } from '../blocks'
import { suitColoring } from '../blocks/suitColoring'

const props = withDefaults(
  defineProps<{ initialMarkdown?: string; editable?: boolean }>(),
  { editable: true },
)

// Emits the serialized body markdown whenever the document changes, so the
// parent can reconstruct + persist the full lesson.
const emit = defineEmits<{ 'update:body': [string] }>()

const nodeViewFactory = useNodeViewFactory()

useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, props.initialMarkdown ?? '')
      ctx.update(editorViewOptionsCtx, (prev) => ({
        ...prev,
        editable: () => props.editable,
      }))
      ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
        emit('update:body', markdown)
      })
    })
    // Bridge blocks are registered BEFORE commonmark so their parseMarkdown
    // matchers take precedence over the generic code_block.
    .use(bridgeBlocks(nodeViewFactory))
    .use(commonmark)
    .use(listener)
    .use(suitColoring),
)
</script>

<template>
  <Milkdown />
</template>
