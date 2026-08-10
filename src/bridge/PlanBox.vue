<script setup lang="ts">
/**
 * Phase-1 PLACEHOLDER for the Bridge-Classroom `PlanBox` (Contract 2).
 *
 * The declarer-play planning worksheet: count the tricks, then decide which
 * technique produces the ones you're short. Two variants — `winners` (count
 * sure winners, develop more) and `losers` (count fast and slow losers, reduce
 * them) — each two sections of three rows: a header bar, a label row, a value
 * row. Blank values print as empty boxes for a student to fill in.
 *
 * Read-only, like every block component: values come in as props, never from
 * editing the rendered DOM.
 */
import { computed } from 'vue'
import SuitText from './SuitText.vue'

type PlanTable = 'winners' | 'losers'

const props = withDefaults(
  defineProps<{
    /** Which worksheet: counting winners to develop, or losers to reduce. */
    table?: PlanTable
    /** Show the counting section (header + suit labels + values). */
    counting?: boolean
    /** Show the technique section (header + labels + values). */
    techniques?: boolean
    /** The four counting cells, in ♠ ♥ ♦ ♣ order. Blank cells print empty. */
    counts?: string[]
    /** The total cell. Omitted, it sums `counts` when all four are numbers. */
    total?: string
    /** One cell per technique column, left to right. */
    plan?: string[]
    /** Technique column labels; defaults to the variant's. */
    labels?: string[]
  }>(),
  { table: 'winners', counting: true, techniques: true },
)

const PRESETS: Record<PlanTable, { count: string; decide: string; techniques: string[] }> = {
  winners: {
    count: 'Count Sure Winners',
    decide: 'Decide How to Develop Winners',
    techniques: ['Promotion', 'Length', 'Finesse', 'End Play'],
  },
  losers: {
    count: 'Count Fast and Slow Losers',
    decide: 'Decide How to Reduce Losers',
    techniques: ['Ruffs', 'Finesse', 'Pitch', 'Length'],
  },
}

const SUITS = [
  { glyph: '♠', red: false },
  { glyph: '♥', red: true },
  { glyph: '♦', red: true },
  { glyph: '♣', red: false },
]

const preset = computed(() => PRESETS[props.table])
const columns = computed(() => props.labels ?? preset.value.techniques)
const countCells = computed(() => SUITS.map((_, i) => props.counts?.[i] ?? ''))
const planCells = computed(() => columns.value.map((_, i) => props.plan?.[i] ?? ''))

/**
 * The total is authored when it has to be — a cell reading "2+" or "♦K" can't
 * be summed — and otherwise derived, so a worked example doesn't make the
 * teacher add up their own four numbers.
 */
const totalCell = computed(() => {
  if (props.total) return props.total
  const numbers = countCells.value.map((c) => (/^\d+$/.test(c) ? Number(c) : null))
  if (numbers.some((n) => n === null)) return ''
  return String(numbers.reduce((sum: number, n) => sum + n!, 0))
})
</script>

<template>
  <div class="bc-planbox-placeholder">
    <table v-if="counting" class="section">
      <tbody>
        <tr>
          <th class="bar bar--count" colspan="5">{{ preset.count }}</th>
        </tr>
        <tr class="labels">
          <td v-for="suit in SUITS" :key="suit.glyph" :class="{ red: suit.red }">{{ suit.glyph }}</td>
          <td>Total</td>
        </tr>
        <tr class="values">
          <td v-for="(cell, i) in countCells" :key="i"><SuitText :text="cell" /></td>
          <td><SuitText :text="totalCell" /></td>
        </tr>
      </tbody>
    </table>
    <table v-if="techniques" class="section">
      <tbody>
        <tr>
          <th class="bar bar--decide" :colspan="columns.length">{{ preset.decide }}</th>
        </tr>
        <tr class="labels">
          <td v-for="label in columns" :key="label"><SuitText :text="label" /></td>
        </tr>
        <tr class="values">
          <td v-for="(cell, i) in planCells" :key="i"><SuitText :text="cell" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Sized in `em` throughout so the box tracks the lesson's text size, the way
   --lesson-scale does for the hand and auction figures. */
.bc-planbox-placeholder {
  display: block;
  width: 100%;
  border: 2px solid var(--planbox-rule, #111);
  background: #fff;
}
.section {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
/* The two sections stack inside one frame, so only the join between them is
   drawn — the outer edges belong to the frame. */
.section + .section {
  border-top: 2px solid var(--planbox-rule, #111);
}
th,
td {
  border: 1px solid var(--planbox-rule, #111);
  text-align: center;
  padding: 0.15em 0.25em;
}
/* The frame already draws the perimeter; a cell border on top of it reads as a
   double rule at print scale. */
tr:first-child th,
tr:first-child td {
  border-top: 0;
}
td:first-child,
th:first-child {
  border-left: 0;
}
td:last-child,
th:last-child {
  border-right: 0;
}
tr:last-child td {
  border-bottom: 0;
}
.bar {
  font-weight: 700;
  font-size: 1.05em;
  padding: 0.2em 0.3em;
}
.bar--count {
  background: var(--planbox-count-bg, #b4c7e7);
}
.bar--decide {
  background: var(--planbox-decide-bg, #c5e0b4);
}
.labels td {
  font-size: 1em;
  line-height: 1.2;
}
.labels .red {
  color: #d32f2f;
}
/* A blank value cell is a box to write in — it needs height with no content. */
.values td {
  height: 2em;
  font-weight: 600;
}
</style>
