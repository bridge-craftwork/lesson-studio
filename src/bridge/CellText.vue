<script setup lang="ts">
/**
 * Renders one `table` cell: a checkbox, or text with red suit glyphs and inline
 * holdings (`D:[K]Q62` → ♦ K Q 6 2 with the K highlighted). The notation is
 * parsed in the DSL (`parseCellText`); this only draws the segments.
 */
import { computed } from 'vue'
import { parseCellText } from '@/dsl'

const props = defineProps<{ text: string }>()
const segments = computed(() => parseCellText(props.text))

const GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' } as const
</script>

<template>
  <span class="bc-cell"
    ><template v-for="(seg, i) in segments" :key="i"
      ><span
        v-if="seg.kind === 'check'"
        class="check"
        :class="{ 'check--on': seg.checked }"
        :aria-label="seg.checked ? 'yes' : 'no'"
        >{{ seg.checked ? '✓' : '' }}</span
      ><span v-else-if="seg.kind === 'holding'" class="holding"
        ><span class="glyph" :class="{ red: seg.suit === 'H' || seg.suit === 'D' }">{{ GLYPH[seg.suit] }}</span
        ><span v-if="seg.cards.length === 0" class="card">—</span
        ><!-- Index keys: `x` repeats within a suit. --><span
          v-for="(card, j) in seg.cards"
          :key="j"
          class="card"
          :class="{ 'card--hl': card.highlight }"
          >{{ card.rank }}</span
        ></span
      ><span v-else-if="seg.red" class="red">{{ seg.text }}</span
      ><template v-else>{{ seg.text }}</template></template
    ></span
  >
</template>

<style scoped>
.red {
  color: #d32f2f;
}
/* A holding never wraps mid-suit. */
.holding {
  white-space: nowrap;
}
.card {
  margin-left: 0.14em;
}
/* The highlighted card is the point of the example: shaded like a highlighter
   pen, and bold. Print must keep the shading (Chrome drops backgrounds by
   default in a browser print dialog). */
.card--hl {
  font-weight: 700;
  background: var(--cell-highlight, #ffe16b);
  border-radius: 0.2em;
  padding: 0 0.14em;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.check {
  display: inline-block;
  box-sizing: border-box;
  width: 1em;
  height: 1em;
  line-height: 0.95em;
  text-align: center;
  vertical-align: -0.15em;
  border: 1.5px solid currentColor;
  border-radius: 0.15em;
  font-weight: 700;
  opacity: 0.35;
}
.check--on {
  opacity: 1;
}
</style>
