<script setup lang="ts">
import { computed } from 'vue'
import { MilkdownProvider } from '@milkdown/vue'
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/vue'
import MilkdownEditor from './MilkdownEditor.vue'
import LessonHeader from './LessonHeader.vue'
import { splitFrontMatter } from '@/dsl'

// A full lesson document: the YAML front matter is split out and rendered as a
// header (not raw text in the editor surface), and only the body is fed to
// Milkdown. Used editable in the studio and read-only in the print view.
const props = withDefaults(
  defineProps<{ markdown: string; editable?: boolean }>(),
  { editable: true },
)

const doc = computed(() => splitFrontMatter(props.markdown))
</script>

<template>
  <div class="lesson-document">
    <LessonHeader :data="doc.data" />
    <MilkdownProvider>
      <ProsemirrorAdapterProvider>
        <!-- key on editable so the surface re-mounts if the mode changes -->
        <MilkdownEditor :key="String(editable)" :initial-markdown="doc.body" :editable="editable" />
      </ProsemirrorAdapterProvider>
    </MilkdownProvider>
  </div>
</template>
