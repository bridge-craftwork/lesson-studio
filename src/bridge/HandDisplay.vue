<script setup lang="ts">
/**
 * Phase-1 PLACEHOLDER for the Bridge-Classroom `HandDisplay` component
 * (Contract 2). Renders the component-form hand (suit -> array of ranks).
 * Replace with the copied-in real component; the prop shape is the contract.
 */
type Holding = { spades: string[]; hearts: string[]; diamonds: string[]; clubs: string[] }

defineProps<{
  hand: Holding | null
  showHcp?: boolean
}>()

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const
const GLYPH: Record<(typeof SUITS)[number], string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

function hcp(hand: Holding): number {
  const pts: Record<string, number> = { A: 4, K: 3, Q: 2, J: 1 }
  return SUITS.flatMap((s) => hand[s]).reduce((n, r) => n + (pts[r] ?? 0), 0)
}
</script>

<template>
  <div v-if="hand" class="bc-hand-placeholder">
    <div v-for="suit in SUITS" :key="suit" class="bc-hand-placeholder__row">
      <span class="bc-hand-placeholder__suit" :class="suit">{{ GLYPH[suit] }}</span>
      <span class="bc-hand-placeholder__ranks">{{ hand[suit].join(' ') || '—' }}</span>
    </div>
    <div v-if="showHcp" class="bc-hand-placeholder__hcp">{{ hcp(hand) }} HCP</div>
  </div>
</template>

<style scoped>
.bc-hand-placeholder {
  display: inline-block;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--ls-border, #ddd);
  border-radius: 6px;
  font-family: var(--ls-mono, monospace);
  line-height: 1.4;
}
.bc-hand-placeholder__suit {
  display: inline-block;
  width: 1.25em;
}
.bc-hand-placeholder__suit.hearts,
.bc-hand-placeholder__suit.diamonds {
  color: #c81e1e;
}
.bc-hand-placeholder__hcp {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--ls-muted, #666);
}
</style>
