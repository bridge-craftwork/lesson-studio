<script setup lang="ts">
/**
 * Phase-1 PLACEHOLDER for the Bridge-Classroom `QuizSnapshot` (Contract 2).
 * Renders a Contract 3 quiz/v1 `bidding` quiz. `variant` controls answer
 * placement (Contract 2 answer-deferral): student defers answers to a trailing
 * list, teacher shows them inline, projection omits them. (The document-level
 * answer registry is a print-view concern; this placeholder shows the
 * per-quiz behavior only.)
 */
import { computed } from 'vue'
import HandDisplay from './vendor/components/HandDisplay.vue'
import CallLabel from './CallLabel.vue'

interface QuizItem {
  hand: { spades: string; hearts: string; diamonds: string; clubs: string }
  answer: string
  explanation?: string
}
interface Quiz {
  title: string
  prompt: string
  items: QuizItem[]
}

const props = withDefaults(
  defineProps<{ quiz: Quiz; variant?: 'student' | 'teacher' | 'projection' }>(),
  { variant: 'student' },
)

const showAnswers = computed(() => props.variant === 'teacher')
const deferAnswers = computed(() => props.variant === 'student')

const asComponent = (h: QuizItem['hand']) => ({
  spades: [...h.spades],
  hearts: [...h.hearts],
  diamonds: [...h.diamonds],
  clubs: [...h.clubs],
})
</script>

<template>
  <div class="bc-quiz-placeholder">
    <div class="head">
      <span class="title">{{ quiz.title }}</span>
      <span class="prompt">{{ quiz.prompt }}</span>
    </div>
    <ol class="items">
      <li v-for="(item, i) in quiz.items" :key="i" class="item">
        <span class="num">{{ i + 1 }}</span>
        <HandDisplay :hand="asComponent(item.hand)" />
        <span v-if="showAnswers" class="answer">→ <CallLabel :value="item.answer" /></span>
      </li>
    </ol>
    <div v-if="deferAnswers" class="answers">
      <div class="answers-head">Answers</div>
      <ol>
        <li v-for="(item, i) in quiz.items" :key="i">
          <CallLabel :value="item.answer" /><template v-if="item.explanation"> — {{ item.explanation }}</template>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.bc-quiz-placeholder {
  border: 1px solid var(--ls-border, #e4e4e7);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  max-width: 34rem;
}
.head {
  margin-bottom: 0.5rem;
}
.title {
  display: block;
  font-weight: 650;
}
.prompt {
  font-size: 0.9rem;
  color: var(--ls-fg, #333);
}
.items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.item {
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
}
.num {
  font-weight: 650;
  color: var(--ls-muted, #666);
}
.answer {
  font-family: var(--ls-mono, monospace);
  color: var(--ls-accent, #1d4ed8);
}
.answers {
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--ls-border, #ccc);
}
.answers-head {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ls-muted, #666);
}
.answers ol {
  margin: 0.25rem 0 0;
  padding-left: 1.2rem;
  font-size: 0.85rem;
}
</style>
