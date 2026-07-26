<script setup lang="ts">
/**
 * Formatting + block-insert ribbon for the editor.
 *
 * Two kinds of control, for two reasons. The **format** buttons (headings,
 * bold, italic, lists, link) drive commands that *also* fire from markdown
 * input rules while typing — they're here for discoverability, so an author who
 * doesn't know the syntax can still reach them. The **insert** buttons are the
 * only way to add a bridge block: a typed ` ```auction ` fence stays literal
 * text, since blocks are created by the load-time parser, not as you type.
 *
 * No H1: the front-matter title is the page heading (a body H1 duplicates it),
 * so the ribbon offers H2/H3 only — reinforcing the convention rather than
 * inviting a mistake.
 */
import { V1_ACTIVE_BLOCKS, blockSchema, type ReservedBlock } from '@/dsl'
import type LessonDocument from './LessonDocument.vue'

const props = defineProps<{ doc: InstanceType<typeof LessonDocument> | null }>()

type CommandName = 'h2' | 'h3' | 'paragraph' | 'bold' | 'italic' | 'bullet' | 'ordered' | 'link'
const format = (name: CommandName) => props.doc?.command(name)
const insert = (tag: ReservedBlock) => props.doc?.insertBlock(tag, blockSchema(tag)?.example ?? '')

// Friendly labels for the insert buttons; the schema summary is the tooltip.
const BLOCK_LABEL: Record<string, string> = {
  hand: 'Hand',
  hands: 'Hands',
  auction: 'Auction',
  'response-box': 'Response box',
  quiz: 'Quiz',
  row: 'Row',
  pagebreak: 'Page break',
  columnbreak: 'Column break',
}
const blocks = V1_ACTIVE_BLOCKS.map((tag) => ({
  tag,
  label: BLOCK_LABEL[tag] ?? tag,
  title: blockSchema(tag)?.summary ?? tag,
}))
</script>

<template>
  <!-- @mousedown.prevent keeps the caret/selection in the editor when a button
       is clicked, so the command runs on the current selection. -->
  <div class="ribbon" role="toolbar" aria-label="Formatting and insert">
    <div class="ribbon__group" aria-label="Text style">
      <button class="ribbon__btn" title="Paragraph" @mousedown.prevent @click="format('paragraph')">¶</button>
      <button class="ribbon__btn" title="Heading 2" @mousedown.prevent @click="format('h2')">H2</button>
      <button class="ribbon__btn" title="Heading 3" @mousedown.prevent @click="format('h3')">H3</button>
    </div>

    <div class="ribbon__group" aria-label="Emphasis">
      <button class="ribbon__btn ribbon__btn--bold" title="Bold (⌘B)" @mousedown.prevent @click="format('bold')">B</button>
      <button class="ribbon__btn ribbon__btn--italic" title="Italic (⌘I)" @mousedown.prevent @click="format('italic')">I</button>
      <button class="ribbon__btn" title="Link" @mousedown.prevent @click="format('link')">🔗</button>
    </div>

    <div class="ribbon__group" aria-label="Lists">
      <button class="ribbon__btn" title="Bullet list" @mousedown.prevent @click="format('bullet')">• List</button>
      <button class="ribbon__btn" title="Numbered list" @mousedown.prevent @click="format('ordered')">1. List</button>
    </div>

    <div class="ribbon__sep" />

    <div class="ribbon__group ribbon__group--insert" aria-label="Insert block">
      <span class="ribbon__label">Insert</span>
      <button
        v-for="b in blocks"
        :key="b.tag"
        class="ribbon__btn ribbon__btn--insert"
        :title="b.title"
        @mousedown.prevent
        @click="insert(b.tag)"
      >
        {{ b.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.ribbon {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.5rem;
  padding: 0.35rem 1rem;
  border-bottom: 1px solid var(--ls-border, #e4e4e7);
  background: var(--ls-bg, #fff);
}
.ribbon__group {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}
.ribbon__group--insert {
  gap: 0.25rem;
}
.ribbon__sep {
  width: 1px;
  align-self: stretch;
  background: var(--ls-border, #e4e4e7);
  margin: 0.1rem 0.35rem;
}
.ribbon__label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ls-muted, #888);
  margin-right: 0.15rem;
}
.ribbon__btn {
  font: inherit;
  font-size: 0.8rem;
  line-height: 1;
  min-width: 1.8rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--ls-border, #e4e4e7);
  border-radius: 6px;
  background: var(--ls-bg, #fff);
  color: var(--ls-fg, #1a1a1a);
  cursor: pointer;
}
.ribbon__btn:hover {
  background: var(--ls-panel, #f7f7f8);
  border-color: var(--ls-accent, #1d4ed8);
}
.ribbon__btn--bold {
  font-weight: 800;
}
.ribbon__btn--italic {
  font-style: italic;
  font-family: Georgia, serif;
}
.ribbon__btn--insert {
  color: var(--ls-accent, #1d4ed8);
}
</style>
