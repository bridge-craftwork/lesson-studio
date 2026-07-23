<script setup lang="ts">
/**
 * Lesson front matter (Contract 4). Two modes:
 *  - editable (studio): a compact form. Binds directly to the reactive `data`
 *    object owned by LessonDocument, which watches it and reconstructs the
 *    lesson markdown.
 *  - read-only (print / preview): a rendered header.
 */
import { ref } from 'vue'
import type { Level } from '@/dsl'

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
</script>

<template>
  <!-- editable form -->
  <div v-if="editable" class="fm-form">
    <input class="fm-form__title" v-model="data.title" placeholder="Lesson title" aria-label="Lesson title" />
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

  <!-- read-only header -->
  <header v-else-if="data.title" class="lesson-header">
    <div class="lesson-header__top">
      <h1 class="lesson-header__title">{{ data.title }}</h1>
      <span v-if="data.level" class="pill">{{ data.level }}</span>
    </div>
    <ul v-if="data.skill_paths.length" class="lesson-header__paths">
      <li v-for="path in data.skill_paths" :key="path" class="tag" :class="{ 'tag--primary': path === data.primary }">
        {{ path }}
      </li>
    </ul>
    <div class="lesson-header__meta">
      <span v-if="data.author">by {{ data.author }}</span>
      <span v-if="data.status" class="status" :class="`status--${data.status}`">{{ data.status }}</span>
      <span v-if="data['reviewed-by']">reviewed-by: {{ data['reviewed-by'] }}</span>
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
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}
.lesson-header__top {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}
.lesson-header__title {
  margin: 0;
  font-size: 1.6rem;
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
.lesson-header__paths {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.6rem 0 0;
  padding: 0;
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
.lesson-header__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.6rem;
  font-size: 0.78rem;
  color: var(--ls-muted, #666);
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
