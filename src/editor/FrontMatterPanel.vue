<script setup lang="ts">
/**
 * Lesson front matter (Contract 4). Two modes:
 *  - editable (studio): a compact form. Binds directly to the reactive `data`
 *    object owned by LessonDocument, which watches it and reconstructs the
 *    lesson markdown.
 *  - read-only (print / preview): a rendered header.
 */
import { nextTick, ref } from 'vue'
import { expandSuitEscapes, type Level } from '@/dsl'
import SuitText from '../bridge/SuitText.vue'

// All fields present (editable form needs defined bindings).
export type FrontMatterFields = {
  title: string
  skill_paths: string[]
  primary: string
  level: Level
  author: string
  status: 'draft' | 'published'
  'reviewed-by': string
  columns: number
  'font-size': number
  'text-scale': number
  'margin-top': number
  'margin-bottom': number
  header: 'standard' | 'minimal' | 'none'
  'quiz-answers': 'end' | 'inline' | 'none'
  date: string
}

const props = defineProps<{ data: FrontMatterFields; editable?: boolean }>()

const LEVELS: Level[] = ['basic', 'intermediate', 'advanced', 'expert']
const newTag = ref('')

function addTag() {
  const t = newTag.value.trim()
  if (t && !props.data.skill_paths.includes(t)) props.data.skill_paths.push(t)
  newTag.value = ''
}
function removeTag(tag: string) {
  const i = props.data.skill_paths.indexOf(tag)
  if (i >= 0) props.data.skill_paths.splice(i, 1)
  if (props.data.primary === tag) props.data.primary = ''
}

// The title is a plain input (no glyph rendering), so expand `\C` shorthand as
// it's typed — matching the prose input rule — and keep the caret put. Each
// escape is two chars collapsing to one, so shift the caret by the number of
// escapes before it.
const ESC_BEFORE = /\\[cdhsCDHS]/g
function onTitleInput(e: Event) {
  const el = e.target as HTMLInputElement
  const raw = el.value
  const caret = el.selectionStart ?? raw.length
  const converted = expandSuitEscapes(raw)
  props.data.title = converted
  if (converted !== raw) {
    const shift = (raw.slice(0, caret).match(ESC_BEFORE) ?? []).length
    nextTick(() => el.setSelectionRange(caret - shift, caret - shift))
  }
}
</script>

<template>
  <!-- editable form -->
  <div v-if="editable" class="fm-form">
    <input
      class="fm-form__title"
      :value="data.title"
      @input="onTitleInput"
      placeholder="Lesson title"
      aria-label="Lesson title"
    />
    <details class="fm-more">
      <summary>Metadata</summary>
      <div class="fm-grid">
        <label>Level
          <select v-model="data.level">
            <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
          </select>
        </label>
        <label>Status
          <select v-model="data.status">
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </label>
        <label>Author <input v-model="data.author" placeholder="Your name" /></label>
        <label>Reviewed by <input v-model="data['reviewed-by']" placeholder="self" /></label>
        <label>Print columns
          <select v-model.number="data.columns">
            <option :value="1">1</option>
            <option :value="2">2</option>
            <option :value="3">3</option>
          </select>
        </label>
        <label>Font size
          <select v-model.number="data['font-size']">
            <option :value="10">10 pt</option>
            <option :value="11">11 pt</option>
            <option :value="12">12 pt — default</option>
            <option :value="13">13 pt</option>
            <option :value="14">14 pt — large print</option>
            <option :value="16">16 pt</option>
          </select>
        </label>
        <label>Text scale
          <select v-model.number="data['text-scale']">
            <option :value="0.9">0.90× — tighter</option>
            <option :value="0.95">0.95×</option>
            <option :value="1">1.00× — none</option>
            <option :value="1.05">1.05×</option>
            <option :value="1.1">1.10× — looser</option>
          </select>
        </label>
        <label>Header
          <select v-model="data.header">
            <option value="standard">standard</option>
            <option value="minimal">minimal — title only</option>
            <option value="none">none</option>
          </select>
        </label>
        <label>Quiz answers
          <select v-model="data['quiz-answers']">
            <option value="end">at end — on a later page</option>
            <option value="inline">inline — beside each hand</option>
            <option value="none">none — omit</option>
          </select>
        </label>
        <label>Date <input v-model="data.date" placeholder="e.g. July 2026" /></label>
        <label>Top margin
          <select v-model.number="data['margin-top']">
            <option :value="0.5">0.5 in — default</option>
            <option :value="0.75">0.75 in</option>
            <option :value="1">1.0 in — room for a header</option>
            <option :value="1.25">1.25 in</option>
          </select>
        </label>
        <label>Bottom margin
          <select v-model.number="data['margin-bottom']">
            <option :value="0.5">0.5 in — default</option>
            <option :value="0.75">0.75 in</option>
            <option :value="1">1.0 in — room for a footer</option>
            <option :value="1.25">1.25 in</option>
          </select>
        </label>
        <label class="fm-grid__wide">Skill paths
          <div class="fm-tags">
            <span v-for="tag in data.skill_paths" :key="tag" class="fm-tag">
              {{ tag }}<button type="button" class="fm-tag__x" @click="removeTag(tag)">×</button>
            </span>
            <input
              class="fm-tag__input"
              v-model="newTag"
              placeholder="add path…"
              @keydown.enter.prevent="addTag"
              @blur="addTag"
            />
          </div>
        </label>
        <label class="fm-grid__wide">Primary path
          <select v-model="data.primary">
            <option value="">— none —</option>
            <option v-for="p in data.skill_paths" :key="p" :value="p">{{ p }}</option>
          </select>
        </label>
      </div>
    </details>
  </div>

  <!-- read-only header: compact two rows. Row 1 — title+level | author.
       Row 2 — taxonomy + status + reviewer | date. `header: minimal` keeps
       only the title row; `header: none` omits it entirely. -->
  <header v-else-if="data.title && data.header !== 'none'" class="lesson-header">
    <div class="lesson-header__row">
      <div class="lesson-header__title-wrap">
        <h1 class="lesson-header__title"><SuitText :text="data.title" /></h1>
        <span v-if="data.level" class="pill">{{ data.level }}</span>
      </div>
      <span v-if="data.author && data.header !== 'minimal'" class="lesson-header__author">
        by {{ data.author }}
      </span>
    </div>
    <div v-if="data.header !== 'minimal'" class="lesson-header__row lesson-header__row--sub">
      <div class="lesson-header__facets">
        <span
          v-for="path in data.skill_paths"
          :key="path"
          class="tag"
          :class="{ 'tag--primary': path === data.primary }"
          >{{ path }}</span
        >
        <span v-if="data.status" class="status" :class="`status--${data.status}`">{{ data.status }}</span>
        <span v-if="data['reviewed-by']" class="lesson-header__reviewer">reviewed by {{ data['reviewed-by'] }}</span>
      </div>
      <span v-if="data.date" class="lesson-header__date">{{ data.date }}</span>
    </div>
  </header>
</template>

<style scoped>
/* ── editable form ── */
.fm-form {
  border-bottom: 1px solid var(--ls-border, #e4e4e7);
  padding-bottom: 0.75rem;
  margin-bottom: 1.25rem;
}
.fm-form__title {
  width: 100%;
  font: inherit;
  font-size: 1.6rem;
  font-weight: 650;
  border: none;
  outline: none;
  padding: 0.1rem 0;
  color: var(--ls-fg, #1a1a1a);
  background: transparent;
}
.fm-form__title::placeholder {
  color: var(--ls-border, #ccc);
}
.fm-more > summary {
  cursor: pointer;
  font-size: 0.78rem;
  color: var(--ls-muted, #666);
  user-select: none;
  padding: 0.2rem 0;
}
.fm-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem 1rem;
  margin-top: 0.5rem;
}
.fm-grid__wide {
  grid-column: 1 / -1;
}
.fm-grid label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.72rem;
  color: var(--ls-muted, #666);
}
.fm-grid input,
.fm-grid select {
  font: inherit;
  font-size: 0.85rem;
  color: var(--ls-fg, #1a1a1a);
  padding: 0.25rem 0.4rem;
  border: 1px solid var(--ls-border, #e4e4e7);
  border-radius: 5px;
  background: var(--ls-bg, #fff);
}
.fm-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
}
.fm-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  font-family: var(--ls-mono, monospace);
  font-size: 0.72rem;
  padding: 0.1rem 0.1rem 0.1rem 0.45rem;
  border-radius: 5px;
  background: var(--ls-panel, #f2f2f4);
  color: var(--ls-fg, #333);
}
.fm-tag__x {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--ls-muted, #888);
  font-size: 0.9rem;
  line-height: 1;
  padding: 0 0.25rem;
}
.fm-tag__x:hover {
  color: #c81e1e;
}
.fm-tag__input {
  flex: 1;
  min-width: 8rem;
  border: 1px dashed var(--ls-border, #ddd) !important;
}

/* ── read-only header ── */
.lesson-header {
  border-bottom: 1px solid var(--ls-border, #e4e4e7);
  padding-bottom: 0.6rem;
  margin-bottom: 1rem;
}
.lesson-header__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}
.lesson-header__row--sub {
  margin-top: 0.4rem;
}
.lesson-header__title-wrap {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  min-width: 0;
}
.lesson-header__title {
  margin: 0;
  font-size: 1.5rem;
  line-height: 1.15;
}
.lesson-header__author {
  flex: none;
  font-size: 0.85rem;
  color: var(--ls-muted, #666);
  white-space: nowrap;
}
.lesson-header__facets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.lesson-header__reviewer {
  font-size: 0.75rem;
  color: var(--ls-muted, #666);
}
.lesson-header__date {
  flex: none;
  font-size: 0.8rem;
  color: var(--ls-muted, #666);
  white-space: nowrap;
}
.pill {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--ls-panel, #eef);
  color: var(--ls-muted, #555);
}
.tag {
  font-family: var(--ls-mono, monospace);
  font-size: 0.72rem;
  padding: 0.12rem 0.5rem;
  border-radius: 5px;
  background: var(--ls-panel, #f2f2f4);
  color: var(--ls-muted, #555);
}
.tag--primary {
  background: color-mix(in srgb, var(--ls-accent, #1d4ed8) 14%, transparent);
  color: var(--ls-accent, #1d4ed8);
  font-weight: 600;
}
.status {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.68rem;
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
}
.status--published {
  background: #e6f4ea;
  color: #1e7a3c;
}
.status--draft {
  background: #fdf0e3;
  color: #a5631a;
}
</style>
