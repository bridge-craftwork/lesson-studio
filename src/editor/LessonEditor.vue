<script setup lang="ts">
import { MilkdownProvider } from '@milkdown/vue'
import MilkdownEditor from './MilkdownEditor.vue'

defineProps<{ initialMarkdown?: string }>()
</script>

<template>
  <div class="lesson-editor">
    <!-- MilkdownProvider must wrap any component that calls useEditor. -->
    <MilkdownProvider>
      <MilkdownEditor :initial-markdown="initialMarkdown" />
    </MilkdownProvider>
  </div>
</template>
