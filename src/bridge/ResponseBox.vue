<script setup lang="ts">
/**
 * Phase-1 PLACEHOLDER for the Bridge-Classroom `ResponseBox` (Contract 2).
 * A titled bid/meaning table; the left column renders with suit glyphs when it
 * parses as a call.
 */
import CallLabel from './CallLabel.vue'
import SuitText from './SuitText.vue'
import { isCall } from '@/dsl'

defineProps<{
  title: string
  rows: { left: string; right: string }[]
  note?: string
}>()
</script>

<template>
  <div class="bc-responsebox-placeholder">
    <div class="title">{{ title }}</div>
    <table>
      <tbody>
        <tr v-for="(row, i) in rows" :key="i">
          <td class="bid"><CallLabel v-if="isCall(row.left)" :value="row.left" /><SuitText v-else :text="row.left" /></td>
          <td class="meaning"><SuitText :text="row.right" /></td>
        </tr>
      </tbody>
    </table>
    <div v-if="note" class="note">{{ note }}</div>
  </div>
</template>

<style scoped>
.bc-responsebox-placeholder {
  display: inline-block;
  border: 1px solid var(--ls-border, #e4e4e7);
  border-radius: 8px;
  overflow: hidden;
  min-width: 15rem;
}
.title {
  padding: 0.4rem 0.75rem;
  font-weight: 650;
  font-size: 0.85rem;
  background: var(--ls-panel, #f7f7f8);
  border-bottom: 1px solid var(--ls-border, #e4e4e7);
}
table {
  border-collapse: collapse;
  width: 100%;
}
td {
  padding: 0.3rem 0.75rem;
  font-size: 0.85rem;
}
td.bid {
  font-family: var(--ls-mono, monospace);
  font-weight: 600;
  white-space: nowrap;
  border-right: 1px solid var(--ls-border, #e4e4e7);
}
tr:not(:last-child) td {
  border-bottom: 1px solid var(--ls-border, #eee);
}
.note {
  padding: 0.4rem 0.75rem;
  font-size: 0.75rem;
  color: var(--ls-muted, #666);
  border-top: 1px solid var(--ls-border, #e4e4e7);
}
</style>
