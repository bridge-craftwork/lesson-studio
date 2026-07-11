<script setup lang="ts">
/**
 * Phase-1 PLACEHOLDER for the Bridge-Classroom `AuctionTable` (Contract 2).
 * Takes a flat, dealer-first `bids` array and lays it into W-N-E-S columns by
 * dealer — the same prop shape the real component uses.
 */
import { computed } from 'vue'
import { formatCall, isRedCall } from '@/dsl'

type Seat = 'N' | 'E' | 'S' | 'W'
const props = defineProps<{
  bids: string[]
  dealer: Seat
  meanings?: { position: number; bid: string; meaning: string }[]
}>()

const DISPLAY: Seat[] = ['W', 'N', 'E', 'S']

// Lay the flat bids into rounds of four columns, offsetting the first round to
// the dealer's column.
const rounds = computed(() => {
  const out: (string | null)[][] = []
  const start = DISPLAY.indexOf(props.dealer)
  let i = 0
  let first = true
  while (i < props.bids.length) {
    const row: (string | null)[] = [null, null, null, null]
    for (let col = first ? start : 0; col < 4 && i < props.bids.length; col++) {
      row[col] = props.bids[i++]
    }
    out.push(row)
    first = false
  }
  return out
})

const noteFor = (bid: string | null, flatIndex: number) =>
  props.meanings?.find((m) => m.position === flatIndex && m.bid === bid)

// Map a (row,col) back to the flat bid index for meaning lookup.
function flatIndex(rowIdx: number, col: number): number {
  const start = DISPLAY.indexOf(props.dealer)
  let n = 0
  for (let r = 0; r < rowIdx; r++) for (let c = r === 0 ? start : 0; c < 4; c++) if (rounds.value[r][c] != null) n++
  // count within current row up to col
  for (let c = rowIdx === 0 ? start : 0; c < col; c++) if (rounds.value[rowIdx][c] != null) n++
  return n
}
</script>

<template>
  <div class="bc-auction-placeholder">
    <table>
      <thead>
        <tr><th v-for="s in DISPLAY" :key="s">{{ s }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="(row, r) in rounds" :key="r">
          <td v-for="(bid, c) in row" :key="c" :class="{ red: bid && isRedCall(bid) }">
            <template v-if="bid === 'AP'"><span class="ap">All Pass</span></template>
            <template v-else-if="bid">
              {{ formatCall(bid) }}<sup v-if="noteFor(bid, flatIndex(r, c))">*</sup>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    <ol v-if="meanings && meanings.length" class="notes">
      <li v-for="(m, i) in meanings" :key="i">{{ formatCall(m.bid) }}: {{ m.meaning }}</li>
    </ol>
  </div>
</template>

<style scoped>
.bc-auction-placeholder {
  display: inline-block;
  font-family: var(--ls-mono, monospace);
}
table {
  border-collapse: collapse;
}
th,
td {
  min-width: 3.5rem;
  padding: 0.15rem 0.5rem;
  text-align: center;
  border: 1px solid var(--ls-border, #e4e4e7);
}
th {
  font-size: 0.7rem;
  color: var(--ls-muted, #666);
  background: var(--ls-panel, #f7f7f8);
}
td.red {
  color: #c81e1e;
}
.ap {
  color: var(--ls-muted, #666);
  font-style: italic;
}
.notes {
  margin: 0.4rem 0 0;
  padding-left: 1.2rem;
  font-size: 0.75rem;
  color: var(--ls-muted, #666);
}
</style>
