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
import { PRINT_STASH_KEY } from '../lesson/useLessonSession'
import { splitFrontMatter, printTypography } from '@/dsl'

// Resolution order: ?lesson= (base64, used by the print-pdf script) →
// the editor's stashed current lesson (interactive Print) → the starter.
const markdown = computed(() => {
  const param = new URLSearchParams(window.location.search).get('lesson')
  if (param) {
    try {
      return decodeURIComponent(escape(atob(param)))
    } catch {
      /* fall through */
    }
  }
  return localStorage.getItem(PRINT_STASH_KEY) ?? STARTER_LESSON
})

// Per-lesson print layout and typography (Contract 4).
const type = computed(() => printTypography(splitFrontMatter(markdown.value).data))
</script>

<template>
  <div
    class="print-view"
    :style="{
      '--print-columns': type.columns,
      '--print-font-pt': type.fontSizePt,
      '--print-text-scale': type.textScale,
    }"
  >
    <LessonDocument :markdown="markdown" :editable="false" />
  </div>
</template>
