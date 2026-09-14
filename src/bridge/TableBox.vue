<script setup lang="ts">
/**
 * Phase-1 PLACEHOLDER for a general table component (Contract 2), rendering
 * the `table` block: an optional title bar, an optional header row, body rows
 * of free-text cells (checkboxes, suit glyphs, inline holdings), and an
 * optional footer note.
 *
 * Read-only, like every block component: values come in as props.
 */
import SuitText from './SuitText.vue'
import CellText from './CellText.vue'

type Align = 'left' | 'center' | 'right'

defineProps<{
  title?: string
  header?: string[]
  rows: string[][]
  /** Resolved per-column alignment, one entry per column. */
  align: Align[]
  note?: string
}>()
</script>

<template>
  <div class="bc-tablebox-placeholder">
    <div v-if="title" class="title"><SuitText :text="title" /></div>
    <table>
      <thead v-if="header">
        <tr>
          <th v-for="(h, i) in header" :key="i" :style="{ textAlign: align[i] }"><CellText :text="h" /></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, r) in rows" :key="r">
          <td v-for="(cell, c) in row" :key="c" :style="{ textAlign: align[c] }"><CellText :text="cell" /></td>
        </tr>
      </tbody>
    </table>
    <div v-if="note" class="note"><CellText :text="note" /></div>
  </div>
</template>

<style scoped>
/* Sized in `em` so it tracks the lesson's text size. Shrink-wraps its columns
   (up to the column width) rather than stretching: stretched, the slack all
   lands in the widest text column and pushes a tick column on its right far
   from one on its left — the opposite of what a comparison table is for.
   It centres ITSELF (fit-content + auto margins) instead of relying on a flex
   parent: printing swaps the `.block-view` wrapper for a `lesson-block:` anchor
   with an inline `display: block`, which silently discards parent centring. */
.bc-tablebox-placeholder {
  display: block;
  width: fit-content;
  max-width: 100%;
  margin-inline: auto;
  box-sizing: border-box;
  border: 1px solid var(--ls-border, #d4d4d8);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
/* The title and note wrap to the table's width instead of setting it —
   `contain: inline-size` drops their text from the box's intrinsic width, so a
   long footer doesn't stretch a narrow table across the column. */
.title,
.note {
  contain: inline-size;
}
.title {
  padding: 0.35em 0.6em;
  font-weight: 650;
  background: var(--ls-panel, #f4f4f5);
  border-bottom: 1px solid var(--ls-border, #d4d4d8);
}
table {
  border-collapse: collapse;
  width: 100%;
}
th,
td {
  padding: 0.25em 0.45em;
  font-size: 0.9em;
  line-height: 1.3;
  vertical-align: top;
}
th {
  font-weight: 650;
  font-size: 0.8em;
  color: var(--ls-muted, #52525b);
  border-bottom: 1px solid var(--ls-border, #d4d4d8);
  white-space: nowrap;
}
tbody tr:not(:last-child) td {
  border-bottom: 1px solid var(--ls-border-soft, #ececef);
}
.note {
  padding: 0.35em 0.6em;
  font-size: 0.8em;
  color: var(--ls-muted, #52525b);
  border-top: 1px solid var(--ls-border, #d4d4d8);
}
</style>
