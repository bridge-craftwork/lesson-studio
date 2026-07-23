<script setup lang="ts">
/**
 * Live print preview: the lesson at real page geometry and real column count,
 * beside the editor.
 *
 * Why a preview rather than columns in the editing surface. The architecture
 * makes page-precise composition a Non-Goal for the editor (authors edit
 * single-column flow), and multicol `contenteditable` is genuinely bad — text
 * reflows between columns on every keystroke and caret behaviour across a
 * column break is unreliable. The question an author actually has is "**does
 * this still fit on one page?**", and only a real render at real width answers
 * that. So: read-only, real geometry.
 *
 * Counting pages without a print engine. CSS gives no way to observe `@page`
 * breaks, and simulating them via overflow columns does not work — with
 * `column-fill: balance` Chrome overflows downward rather than into new
 * columns, and `scrollWidth` saturates (measured: it caps at ~1 extra column no
 * matter how much overflows). So the count comes from the flow's own geometry
 * instead: measure the *balanced column height* `H` at unconstrained height,
 * and since each printed page holds one page-height of that flow, the first
 * page holding less because the lesson header spans above it:
 *
 *     pages = H <= (PAGE_H - headerH) ? 1 : 1 + ceil((H - (PAGE_H - headerH)) / PAGE_H)
 *
 * Verified against Playwright-rendered PDFs of the same lessons at 1, 2, 2 and
 * 4 pages — exact agreement on all four.
 *
 * Only page 1 is drawn. Pages 2+ would need the print engine's fragmentation,
 * which the browser won't expose; the count tells you they exist, and Print
 * shows them. Page 1 keeps print.css's own `column-fill: balance` — switching
 * it to `auto` to mimic a filled first page was tried and is worse: Chrome then
 * fills column 1 and leaves the rest of the page empty.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import LessonDocument from '../editor/LessonDocument.vue'
import { splitFrontMatter, printTypography } from '@/dsl'

const props = defineProps<{ markdown: string }>()

// Letter minus the 0.5in @page margin, in CSS px at 96dpi — the geometry
// print.css lays out to.
const PAGE_W = 720
const PAGE_H = 960

const pages = ref(1)
const scale = ref(0.5)
const root = ref<HTMLElement | null>(null)
const flow = ref<HTMLElement | null>(null)

/**
 * Milkdown takes its content from `defaultValueCtx` **once, at creation**, and
 * never watches the prop — deliberately, since feeding the editor's own edits
 * back would remount it mid-keystroke. So handing the preview new markdown does
 * nothing; it has to be remounted to re-render.
 *
 * Remounting an editor per keystroke would be wasteful, so the text is settled
 * first and the key bumped after a pause. The preview trails typing by that
 * pause, which is the right trade for a page-fit check.
 */
const SETTLE_MS = 300
const shown = ref(props.markdown)
// Read from the settled text, not the live prop, so the layout can't change a
// beat before the content it applies to.
const type = computed(() => printTypography(splitFrontMatter(shown.value).data))
const columns = computed(() => type.value.columns)
const renderKey = ref(0)
let settleTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.markdown,
  (md) => {
    clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      shown.value = md
      renderKey.value += 1
    }, SETTLE_MS)
  },
)

/** Fit the page width to the pane, never enlarging past 1:1. */
function fitScale() {
  const available = (root.value?.clientWidth ?? PAGE_W) - 28
  scale.value = Math.min(1, Math.max(0.25, available / PAGE_W))
}

/**
 * Measure on a detached clone at unconstrained height, so the live page box
 * keeps its fixed page height while the measurement sees the full flow.
 */
function measure() {
  const el = flow.value
  if (!el) return
  const clone = el.cloneNode(true) as HTMLElement
  clone.style.cssText += ';position:absolute;left:-99999px;top:0;width:720px;height:auto;zoom:1;transform:none;'
  const body = clone.querySelector<HTMLElement>('.ProseMirror')
  if (!body) return
  body.style.height = 'auto'
  body.style.flex = 'none'
  body.style.columnFill = 'balance'
  document.body.appendChild(clone)
  const columnHeight = body.getBoundingClientRect().height
  const headerHeight = clone.querySelector('.lesson-header')?.getBoundingClientRect().height ?? 0
  clone.remove()

  const firstPage = PAGE_H - headerHeight
  pages.value =
    columnHeight <= firstPage ? 1 : 1 + Math.ceil((columnHeight - firstPage) / PAGE_H)
}

async function refresh() {
  await nextTick()
  fitScale()
  measure()
}

let ro: ResizeObserver | null = null
let mo: MutationObserver | null = null
let measureTimer: ReturnType<typeof setTimeout> | undefined

/** Milkdown renders asynchronously after mount, so measure once it settles. */
function scheduleMeasure() {
  clearTimeout(measureTimer)
  measureTimer = setTimeout(measure, 60)
}

onMounted(() => {
  refresh()
  // Fonts land after first paint and change wrapping, so re-measure once they do.
  ;(document as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready?.then(refresh)
  if (typeof ResizeObserver !== 'undefined' && root.value) {
    ro = new ResizeObserver(() => {
      fitScale()
      scheduleMeasure()
    })
    ro.observe(root.value)
  }
  // The remount below replaces the whole subtree; watching it is more reliable
  // than guessing how long Milkdown takes to draw.
  if (typeof MutationObserver !== 'undefined' && flow.value) {
    mo = new MutationObserver(scheduleMeasure)
    mo.observe(flow.value, { childList: true, subtree: true, characterData: true })
  }
})
onBeforeUnmount(() => {
  ro?.disconnect()
  mo?.disconnect()
  clearTimeout(settleTimer)
  clearTimeout(measureTimer)
})

watch(type, refresh, { deep: true })
</script>

<template>
  <div ref="root" class="pp">
    <div class="pp__bar">
      <span class="pp__count" :class="{ 'is-over': pages > 1 }">
        {{ pages }} page{{ pages === 1 ? '' : 's' }}
      </span>
      <span class="pp__cols">{{ columns }}-column · {{ type.effectivePt }}pt</span>
      <span v-if="pages > 1" class="pp__hint">
        showing page 1 — more columns won’t help, narrow columns wrap taller
      </span>
    </div>

    <div class="pp__pages">
      <div class="pp__page">
        <div class="pp__clip" :style="{ '--pp-scale': scale }">
          <div
            ref="flow"
            class="print-view pp__flow"
            :style="{
              '--print-columns': type.columns,
              '--print-font-pt': type.fontSizePt,
              '--print-text-scale': type.textScale,
            }"
          >
            <LessonDocument :key="renderKey" :markdown="shown" :editable="false" />
          </div>
        </div>
        <div v-if="pages > 1" class="pp__more">+{{ pages - 1 }} more</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pp {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  overflow: auto;
  background: var(--ls-panel, #f7f7f8);
  border-left: 1px solid var(--ls-border, #e4e4e7);
}

.pp__bar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  font-size: 0.72rem;
  background: var(--ls-panel, #f7f7f8);
  border-bottom: 1px solid var(--ls-border, #e4e4e7);
}
.pp__count {
  font-weight: 700;
}
.pp__count.is-over {
  color: #b45309;
}
.pp__cols,
.pp__hint {
  color: var(--ls-muted, #666);
}
.pp__hint {
  flex: 1;
  text-align: right;
  min-width: 0;
}

.pp__pages {
  display: flex;
  justify-content: center;
  padding: 0.75rem 0 1.5rem;
}
.pp__page {
  position: relative;
}

/* The page's text area at true size, scaled as one unit so every measurement
   inside stays in real print proportion. */
.pp__clip {
  width: calc(720px * var(--pp-scale));
  height: calc(960px * var(--pp-scale));
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.16);
}
.pp__flow {
  width: 720px;
  height: 960px;
  display: flex;
  flex-direction: column;
  zoom: var(--pp-scale);
}
/* The multicol body takes the height left under the header — the page's real
   text area. */
.pp__flow :deep(.ProseMirror) {
  flex: 1;
  min-height: 0;
}
.pp__more {
  position: absolute;
  right: 0;
  bottom: -1.15rem;
  font-size: 0.65rem;
  color: #b45309;
}
</style>
