<script setup lang="ts">
/**
 * The document's collected quiz answers — a print/preview section rendered on a
 * later page when `quiz-answers: end` (the default). Answers group by each quiz
 * block's prompt, numbered 1..k to match the hands the block shows in the body.
 * A print artifact, generated from the lesson; never authored or click-mapped.
 */
import CallLabel from '../bridge/CallLabel.vue'
import SuitText from '../bridge/SuitText.vue'
import type { QuizAnswerGroup } from '@/dsl'

defineProps<{ groups: QuizAnswerGroup[] }>()
</script>

<template>
  <section class="quiz-answers">
    <h2 class="quiz-answers__head">Answers</h2>
    <div v-for="(g, gi) in groups" :key="gi" class="qa-group">
      <p class="qa-group__prompt"><SuitText :text="g.prompt" /></p>
      <ol class="qa-group__list">
        <li v-for="(a, ai) in g.answers" :key="ai" class="qa-item">
          <CallLabel :value="a.answer" /><span
            v-for="alt in a.alternates || []"
            :key="alt"
            class="qa-item__alt"
          >or <CallLabel :value="alt" /></span>
          <template v-if="a.explanation"> — <SuitText :text="a.explanation" /></template>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.quiz-answers {
  /* Sits after the multicol body (not inside it), so a plain forced break lands
     the whole section on a fresh page — quizzes on earlier pages, answers here. */
  break-before: page;
  padding-top: 0.5rem;
}
.quiz-answers__head {
  font-size: 1.05em;
  font-weight: 700;
  margin: 0 0 0.6em;
  padding-bottom: 0.2em;
  border-bottom: 1px solid currentColor;
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
.qa-group__list {
  margin: 0;
  padding-left: 1.4em;
}
.qa-item {
  margin-bottom: 0.1em;
  line-height: 1.4;
}
.qa-item__alt {
  margin-left: 0.35em;
  color: var(--ls-muted, #666);
}
</style>
