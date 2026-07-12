<script setup lang="ts">
/**
 * Read-only print rendering of a lesson: the same LessonDocument the editor
 * uses, with editing off and the print stylesheet applied. Playwright loads
 * this page and emits a PDF for the pdf-handouts pipeline.
 *
 * The lesson source is passed via the `?lesson=` query (base64) when driven by
 * the print script; it falls back to the starter lesson for standalone preview.
 */
import { computed } from 'vue'
import LessonDocument from '../editor/LessonDocument.vue'
import { STARTER_LESSON } from '../editor/starter'
import { splitFrontMatter } from '@/dsl'

const markdown = computed(() => {
  const param = new URLSearchParams(window.location.search).get('lesson')
  if (!param) return STARTER_LESSON
  try {
    return decodeURIComponent(escape(atob(param)))
  } catch {
    return STARTER_LESSON
  }
})

// Per-lesson column count (front-matter `columns`, default 2).
const columns = computed(() => splitFrontMatter(markdown.value).data?.columns ?? 2)
</script>

<template>
  <div class="print-view" :style="{ '--print-columns': columns }">
    <LessonDocument :markdown="markdown" :editable="false" />
  </div>
</template>
