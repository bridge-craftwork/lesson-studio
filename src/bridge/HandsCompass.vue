<script setup lang="ts">
/**
 * Phase-1 PLACEHOLDER for the Bridge-Classroom `HandsCompass` (Contract 2):
 * the two/four-hand compass. West left, South bottom. Composes HandDisplay per
 * seat; hands are in component (array) form.
 */
import { computed } from 'vue'
import HandDisplay from './HandDisplay.vue'

type Seat = 'N' | 'E' | 'S' | 'W'
type Holding = { spades: string[]; hearts: string[]; diamonds: string[]; clubs: string[] }

const props = defineProps<{
  hands: Partial<Record<Seat, Holding>>
  layout?: 'NS' | 'EW' | 'all'
  labels?: Partial<Record<Seat, string>>
}>()

const shown = computed<Seat[]>(() => {
  if (props.layout === 'NS') return ['N', 'S']
  if (props.layout === 'EW') return ['E', 'W']
  if (props.layout === 'all') return ['N', 'E', 'S', 'W']
  return (['N', 'E', 'S', 'W'] as Seat[]).filter((s) => props.hands[s])
})

const at = (s: Seat) => (shown.value.includes(s) ? s : null)
</script>

<template>
  <div class="bc-compass-placeholder">
    <div class="cell n"><HandDisplay v-if="at('N') && hands.N" :hand="hands.N" /><span v-if="labels?.N" class="lbl">{{ labels.N }}</span></div>
    <div class="cell w"><HandDisplay v-if="at('W') && hands.W" :hand="hands.W" /><span v-if="labels?.W" class="lbl">{{ labels.W }}</span></div>
    <div class="cell mid">♦</div>
    <div class="cell e"><HandDisplay v-if="at('E') && hands.E" :hand="hands.E" /><span v-if="labels?.E" class="lbl">{{ labels.E }}</span></div>
    <div class="cell s"><HandDisplay v-if="at('S') && hands.S" :hand="hands.S" /><span v-if="labels?.S" class="lbl">{{ labels.S }}</span></div>
  </div>
</template>

<style scoped>
.bc-compass-placeholder {
  display: inline-grid;
  grid-template-columns: auto auto auto;
  grid-template-areas:
    '. n .'
    'w mid e'
    '. s .';
  gap: 0.5rem 1rem;
  align-items: center;
  justify-items: center;
  padding: 0.5rem;
}
.cell.n { grid-area: n; }
.cell.w { grid-area: w; }
.cell.mid { grid-area: mid; color: var(--ls-muted, #999); }
.cell.e { grid-area: e; }
.cell.s { grid-area: s; }
.lbl {
  display: block;
  text-align: center;
  font-size: 0.7rem;
  color: var(--ls-muted, #666);
}
</style>
