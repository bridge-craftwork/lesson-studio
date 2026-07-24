<script setup lang="ts">
/**
 * Read-only print rendering of a lesson: the same LessonDocument the editor
 * uses, with editing off and the print stylesheet applied. Playwright loads
 * this page and emits a PDF for the pdf-handouts pipeline.
 *
 * The lesson source is passed via the `?lesson=` query (base64) when driven by
 * the print script; it falls back to the starter lesson for standalone preview.
 *
 * A non-printing bar offers "drop-to-attach": print to PDF the normal way, then
 * drop it back to embed the Contract 5 attachments (source, provenance, click
 * map, PBN) client-side. See pdfExport.ts for why the two steps are unavoidable.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import LessonDocument from '../editor/LessonDocument.vue'
import { STARTER_LESSON } from '../editor/starter'
import { PRINT_STASH_KEY } from '../lesson/useLessonSession'
import { splitFrontMatter, printTypography } from '@/dsl'
import {
  attachToPrintedPdf,
  downloadPdf,
  lessonFileStem,
  wrapBlocksForPrint,
} from '../lesson/pdfExport'

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

const type = computed(() => printTypography(splitFrontMatter(markdown.value).data))

// Wrap each block in a `lesson-block:<n>` anchor for the duration of printing,
// so Chrome emits the link annotations the click map is read from. Installed on
// beforeprint / torn down on afterprint, so ProseMirror never sees a lasting
// mutation — page.pdf() (the CLI path) doesn't fire these events, so it keeps
// using markBlocks and there's no double-wrap.
let unwrap: (() => void) | null = null
const onBefore = () => {
  unwrap = wrapBlocksForPrint()
}
const onAfter = () => {
  unwrap?.()
  unwrap = null
}
onMounted(() => {
  window.addEventListener('beforeprint', onBefore)
  window.addEventListener('afterprint', onAfter)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeprint', onBefore)
  window.removeEventListener('afterprint', onAfter)
  unwrap?.()
})

// --- drop-to-attach --------------------------------------------------------
type Status = { kind: 'idle' | 'busy' | 'done' | 'error'; message?: string }
const status = ref<Status>({ kind: 'idle' })
const dragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

async function ingest(file: File) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    status.value = { kind: 'error', message: 'That isn’t a PDF.' }
    return
  }
  status.value = { kind: 'busy', message: `Embedding into ${file.name}…` }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const stem = lessonFileStem(markdown.value)
    const out = await attachToPrintedPdf(bytes, markdown.value, { sourceFile: `${stem}.md` })
    downloadPdf(out, `${stem}.embedded.pdf`)
    status.value = { kind: 'done', message: `Downloaded ${stem}.embedded.pdf with source embedded.` }
  } catch (e) {
    status.value = { kind: 'error', message: e instanceof Error ? e.message : String(e) }
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) ingest(file)
}
function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) ingest(file)
}
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

  <!-- Screen-only: never part of the printed page. -->
  <div
    class="attach-bar"
    :class="{ 'is-drag': dragging, [`is-${status.kind}`]: true }"
    @dragover.prevent="dragging = true"
    @dragleave="dragging = false"
    @drop="onDrop"
  >
    <div class="attach-bar__step">
      <strong>To get a PDF that carries its own source:</strong>
      print this page to PDF (⌘/Ctrl+P → Save as PDF), then drop it here — or
      <button type="button" class="attach-bar__browse" @click="fileInput?.click()">choose it</button>.
      The lesson markdown, click-map and PBN are embedded in your browser; nothing is uploaded.
      <input ref="fileInput" type="file" accept="application/pdf" class="attach-bar__file" @change="onPick" />
    </div>
    <div v-if="status.message" class="attach-bar__status">{{ status.message }}</div>
  </div>
</template>

<style scoped>
.attach-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  padding: 0.6rem 1rem;
  font-size: 0.85rem;
  line-height: 1.4;
  background: var(--ls-panel, #f7f7f8);
  border-top: 1px solid var(--ls-border, #e4e4e7);
  color: var(--ls-fg, #1a1a1a);
}
.attach-bar.is-drag {
  outline: 2px dashed var(--ls-accent, #1d4ed8);
  outline-offset: -4px;
  background: #eef2ff;
}
.attach-bar__browse {
  font: inherit;
  color: var(--ls-accent, #1d4ed8);
  background: none;
  border: none;
  padding: 0;
  text-decoration: underline;
  cursor: pointer;
}
.attach-bar__file {
  display: none;
}
.attach-bar__status {
  margin-top: 0.35rem;
  color: var(--ls-muted, #666);
}
.attach-bar.is-done .attach-bar__status {
  color: #15803d;
}
.attach-bar.is-error .attach-bar__status {
  color: #b91c1c;
}

@media print {
  .attach-bar {
    display: none !important;
  }
}
</style>
