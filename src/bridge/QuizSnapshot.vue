<script setup lang="ts">
/**
 * Phase-1 PLACEHOLDER for the Bridge-Classroom `QuizSnapshot` (Contract 2).
 * Renders one `quiz-embed/v1` exercise (Contract 3 `bidding`): a shared prompt
 * over a set of hands, each with the auction it faces and its expected call.
 *
 * `answers` controls answer visibility (Contract 2 answer-deferral):
 *   - `inline`   — show each answer beside its hand (author view / teacher print);
 *   - `deferred` — show questions only; the *document* renders answers elsewhere
 *                  (the print pipeline's collected answer section);
 *   - `hidden`   — no answers at all (projection).
 * `startNumber` lets the document number questions continuously across blocks.
 */
import { computed } from 'vue'
import HandDisplay from './vendor/components/HandDisplay.vue'
import CallLabel from './CallLabel.vue'
import SuitText from './SuitText.vue'

interface Hand {
  spades: string
  hearts: string
  diamonds: string
  clubs: string
}
interface Question {
  hand: Hand
  seat?: string
  dealer?: string
  vulnerability?: string
  context?: { dealer?: string; calls: string[] }
  answer: string
  alternates?: string[]
  explanation?: string
}
interface Exercise {
  title: string
  prompt: string
  questions: Question[]
}

const props = withDefaults(
  defineProps<{
    exercise: Exercise
    answers?: 'inline' | 'deferred' | 'hidden'
    /** This quiz's 1-based position in the document; drives `N-M` numbering. */
    exerciseNumber?: number
  }>(),
  { answers: 'inline' },
)

const showAnswer = computed(() => props.answers === 'inline')
// Hands number `N-M` (exercise-question) when the exercise number is known,
// else fall back to a plain per-quiz `M`.
const numberFor = (i: number) => (props.exerciseNumber ? `${props.exerciseNumber}-${i + 1}` : `${i + 1}`)

const toComponentHand = (h: Hand) => ({
  spades: [...h.spades],
  hearts: [...h.hearts],
  diamonds: [...h.diamonds],
  clubs: [...h.clubs],
})
</script>

<template>
  <div class="bc-quiz">
    <p class="bc-quiz__prompt">
      <span v-if="exerciseNumber" class="bc-quiz__ex">{{ exerciseNumber }}.</span>
      <SuitText :text="exercise.prompt" />
    </p>
    <ol class="bc-quiz__items">
      <li v-for="(q, i) in exercise.questions" :key="i" class="bc-quiz__item">
        <div class="bc-quiz__num">{{ numberFor(i) }}</div>
        <HandDisplay :hand="toComponentHand(q.hand)" :show-hcp="true" />
        <div class="bc-quiz__meta">
          <div v-if="q.context && q.context.calls.length" class="bc-quiz__auction">
            <span
              v-for="(call, c) in q.context.calls"
              :key="c"
              class="bc-quiz__call"
            ><CallLabel :value="call" /></span>
            <span class="bc-quiz__call bc-quiz__call--turn">?</span>
          </div>
          <div v-if="showAnswer" class="bc-quiz__answer">
            <CallLabel :value="q.answer" /><span
              v-for="alt in q.alternates || []"
              :key="alt"
              class="bc-quiz__alt"
            >or <CallLabel :value="alt" /></span>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.bc-quiz {
  border: 1px solid var(--ls-border, #e4e4e7);
  border-radius: 8px;
  padding: 0.75em 1em;
}
.bc-quiz__prompt {
  margin: 0 0 0.6em;
  font-weight: 650;
}
.bc-quiz__ex {
  margin-right: 0.3em;
}
.bc-quiz__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 1em 1.4em;
}
.bc-quiz__item {
  display: grid;
  grid-template-columns: auto auto;
  grid-template-rows: auto auto;
  align-items: start;
  gap: 0.1em 0.4em;
}
.bc-quiz__num {
  grid-row: 1 / 3;
  align-self: center;
  font-weight: 650;
  color: var(--ls-muted, #666);
  font-variant-numeric: tabular-nums;
}
.bc-quiz__meta {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  gap: 0.1em;
  font-size: 0.85em;
}
.bc-quiz__auction {
  display: flex;
  gap: 0.4em;
  color: var(--ls-muted, #666);
}
.bc-quiz__call--turn {
  color: var(--ls-accent, #1d4ed8);
  font-weight: 700;
}
.bc-quiz__answer {
  font-weight: 650;
}
.bc-quiz__alt {
  margin-left: 0.35em;
  font-weight: 400;
  color: var(--ls-muted, #666);
}
</style>
