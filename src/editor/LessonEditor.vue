<script setup lang="ts">
import { MilkdownProvider } from '@milkdown/vue'
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/vue'
import MilkdownEditor from './MilkdownEditor.vue'

defineProps<{ initialMarkdown?: string }>()
</script>

<template>
  <div class="lesson-editor">
    <!-- MilkdownProvider wraps any component calling useEditor;
         ProsemirrorAdapterProvider wraps any component calling
         useNodeViewFactory (the Vue-node-view bridge). -->
    <MilkdownProvider>
      <ProsemirrorAdapterProvider>
        <MilkdownEditor :initial-markdown="initialMarkdown" />
      </ProsemirrorAdapterProvider>
    </MilkdownProvider>
  </div>
</template>
