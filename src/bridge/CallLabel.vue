<script setup lang="ts">
/**
 * Renders a call with per-glyph coloring: only the suit symbol of a red suit
 * (♦/♥) is red; the level digit, `NT`, `Pass`/`Dbl`, and any surrounding text
 * (e.g. an annotation superscript) stay in the default color.
 */
import { callSegments } from '@/dsl'

defineProps<{ value: string }>()
</script>

<template>
  <span class="call"
    ><span v-for="(seg, i) in callSegments(value)" :key="i" :class="{ red: seg.red }">{{ seg.text }}</span></span
  >
</template>

<style scoped>
.call .red {
  color: #c81e1e;
}
</style>
