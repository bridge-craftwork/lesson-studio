<script setup lang="ts">
import { reactive, ref, watch, computed, nextTick } from 'vue'
import { MilkdownProvider } from '@milkdown/vue'
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/vue'
import MilkdownEditor from './MilkdownEditor.vue'
import FrontMatterPanel, { type FrontMatterFields } from './FrontMatterPanel.vue'
import { splitFrontMatter, serializeFrontMatter } from '@/dsl'

// A full lesson document. The YAML front matter is split out and edited through
// the FrontMatterPanel; the body is edited in Milkdown. Either edit source
// reconstructs the full lesson markdown, which is emitted for saving. No emit
// happens on load, so opening a file isn't spuriously "dirty".
const props = withDefaults(
  defineProps<{ markdown: string; editable?: boolean }>(),
  { editable: true },
)

const emit = defineEmits<{ 'update:markdown': [string] }>()

function defaults(): FrontMatterFields {
  return {
    title: '',
    skill_paths: [],
    primary: '',
    level: 'intermediate',
    author: '',
    status: 'draft',
    'reviewed-by': '',
  }
}

const fm = reactive<FrontMatterFields>(defaults())
const bodyMarkdown = ref('')
// The body handed to Milkdown at mount; recomputed only when a new doc loads.
const initialBody = computed(() => splitFrontMatter(props.markdown).body)

let loading = false

// Reset state whenever a new lesson loads (props.markdown changes on
// New/Open/Restore). This must NOT trigger an emit.
watch(
  () => props.markdown,
  (md) => {
    loading = true
    const { data, body } = splitFrontMatter(md)
    Object.assign(fm, defaults(), data ?? {})
    bodyMarkdown.value = body
    // The deep `fm` watch fires on the flush after this sync reset; keep the
    // guard up until then so the reset doesn't emit as if it were an edit.
    nextTick(() => {
      loading = false
    })
  },
  { immediate: true },
)

function emitFull() {
  if (loading) return
  const front = serializeFrontMatter(fm)
  const body = bodyMarkdown.value
  emit('update:markdown', front ? `${front}\n${body.replace(/^\n+/, '')}` : body)
}

function onBody(body: string) {
  bodyMarkdown.value = body
  emitFull()
}

// Front-matter panel mutates `fm` in place; a deep watch catches every field.
watch(fm, emitFull, { deep: true })
</script>

<template>
  <div class="lesson-document">
    <FrontMatterPanel :data="fm" :editable="editable" />
    <MilkdownProvider>
      <ProsemirrorAdapterProvider>
        <MilkdownEditor
          :key="String(editable)"
          :initial-markdown="initialBody"
          :editable="editable"
          @update:body="onBody"
        />
      </ProsemirrorAdapterProvider>
    </MilkdownProvider>
  </div>
</template>
