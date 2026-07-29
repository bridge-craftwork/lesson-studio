<script setup lang="ts">
/**
 * Renders the collected quiz answers for the `answers` block. Answers group by
 * each quiz block's prompt, headed by its exercise number and numbered `N-M` to
 * match the hands that block shows in the body. Generated from the document's
 * quiz blocks; the `answers` block itself carries only display settings.
 */
import CallLabel from '../bridge/CallLabel.vue'
import SuitText from '../bridge/SuitText.vue'
import type { QuizAnswerGroup } from '@/dsl'

withDefaults(defineProps<{ groups: QuizAnswerGroup[]; columns?: number }>(), { columns: 1 })
</script>

<template>
  <div class="quiz-answers" :style="{ '--qa-columns': columns }">
    <h2 class="quiz-answers__head">Answers</h2>
    <div class="quiz-answers__cols">
      <div v-for="g in groups" :key="g.exercise" class="qa-group">
        <p class="qa-group__prompt"><span class="qa-group__ex">{{ g.exercise }}.</span> <SuitText :text="g.prompt" /></p>
        <ol class="qa-group__list">
          <li v-for="(a, ai) in g.answers" :key="ai" class="qa-item">
            <span class="qa-item__num">{{ g.exercise }}-{{ ai + 1 }}</span>
            <CallLabel :value="a.answer" /><span
              v-for="alt in a.alternates || []"
              :key="alt"
              class="qa-item__alt"
            >or <CallLabel :value="alt" /></span>
            <template v-if="a.explanation"> — <SuitText :text="a.explanation" /></template>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-answers {
  padding-top: 0.5rem;
}
.quiz-answers__head {
  font-size: 1.05em;
  font-weight: 700;
  margin: 0 0 0.6em;
  padding-bottom: 0.2em;
  border-bottom: 1px solid currentColor;
}
.quiz-answers__cols {
  column-count: var(--qa-columns, 1);
  column-gap: 1.5em;
}
.qa-group {
  margin-bottom: 0.9em;
  break-inside: avoid;
}
.qa-group__prompt {
  margin: 0 0 0.2em;
  font-weight: 650;
  font-size: 0.95em;
}
.qa-group__ex {
  font-weight: 700;
}
.qa-group__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.qa-item {
  margin-bottom: 0.1em;
  line-height: 1.4;
}
.qa-item__num {
  display: inline-block;
  min-width: 2.4em;
  color: var(--ls-muted, #666);
  font-variant-numeric: tabular-nums;
}
.qa-item__alt {
  margin-left: 0.35em;
  color: var(--ls-muted, #666);
}
</style>
