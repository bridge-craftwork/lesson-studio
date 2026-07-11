<script setup lang="ts">
import { computed } from 'vue'
import { MilkdownProvider } from '@milkdown/vue'
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/vue'
import MilkdownEditor from './MilkdownEditor.vue'
import LessonHeader from './LessonHeader.vue'
import { splitFrontMatter, joinFrontMatter } from '@/dsl'

// A full lesson document: the YAML front matter is split out and rendered as a
// header (not raw text in the editor surface), and only the body is fed to
// Milkdown. On edit, the body is recombined with the preserved raw front matter
// and emitted as the full lesson markdown for saving.
const props = withDefaults(
  defineProps<{ markdown: string; editable?: boolean }>(),
  { editable: true },
)

const emit = defineEmits<{ 'update:markdown': [string] }>()

const doc = computed(() => splitFrontMatter(props.markdown))

function onBody(body: string) {
  // Keep one blank line between the front matter and the body.
  const spacedBody = doc.value.raw ? `\n${body.replace(/^\n+/, '')}` : body
  emit('update:markdown', joinFrontMatter(doc.value.raw, spacedBody))
}
</script>

<template>
  <div class="lesson-document">
    <LessonHeader :data="doc.data" />
    <MilkdownProvider>
      <ProsemirrorAdapterProvider>
        <MilkdownEditor
          :key="String(editable)"
          :initial-markdown="doc.body"
          :editable="editable"
          @update:body="onBody"
        />
      </ProsemirrorAdapterProvider>
    </MilkdownProvider>
  </div>
</template>
