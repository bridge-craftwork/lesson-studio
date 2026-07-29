<script setup lang="ts">
/**
 * Quiz picker — two phases in one modal:
 *   1. Browse — choose/point at a remembered PBS `quiz/` folder and pick a
 *      lesson from its `index.json` manifest (or open a single `.json`).
 *   2. Pick — browse the chosen lesson's exercises (a shared prompt over a group
 *      of hands), select questions, and insert them. One `quiz` block is created
 *      per exercise that has a selection (see quiz-block.ts).
 * `lesson === null` shows phase 1; a loaded lesson shows phase 2.
 */
import { computed, reactive, ref } from 'vue'
import { HandDisplay } from '@bridge-craftwork/bridge-components'
import CallLabel from '../bridge/CallLabel.vue'
import SuitText from '../bridge/SuitText.vue'
import {
  buildQuizEmbed,
  quizSourceFromLesson,
  toComponentHand,
  type QuizLesson,
  type QuizEmbed,
  type QuizManifestEntry,
  type Hand,
} from '@/dsl'

const props = defineProps<{
  lesson: QuizLesson | null
  manifest: QuizManifestEntry[]
  folderName: string | null
  needsPermission: boolean
  supportsFolder: boolean
  error: string | null
}>()
const emit = defineEmits<{
  (e: 'insert', embeds: QuizEmbed[]): void
  (e: 'close'): void
  (e: 'choose-folder'): void
  (e: 'grant-folder'): void
  (e: 'forget-folder'): void
  (e: 'open-file'): void
  (e: 'open-lesson', entry: QuizManifestEntry): void
  (e: 'back'): void
}>()

// --- phase 1: manifest filter ---
const filter = ref('')
const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return props.manifest
  return props.manifest.filter((l) => l.title.toLowerCase().includes(q) || l.id.toLowerCase().includes(q))
})

// --- phase 2: selection + expansion ---
const picked = reactive<Record<string, boolean>>({})
const expanded = reactive<Record<number, boolean>>({ 0: true })

const key = (ei: number, qi: number) => `${ei}:${qi}`
const isPicked = (ei: number, qi: number) => !!picked[key(ei, qi)]
const toggle = (ei: number, qi: number) => (picked[key(ei, qi)] = !picked[key(ei, qi)])
const selectedIn = (ei: number) =>
  props.lesson!.exercises[ei].questions.reduce((n, _q, qi) => n + (isPicked(ei, qi) ? 1 : 0), 0)
const selectFirst = (ei: number, n: number) =>
  props.lesson!.exercises[ei].questions.forEach((_q, qi) => (picked[key(ei, qi)] = qi < n))
const clearEx = (ei: number) =>
  props.lesson!.exercises[ei].questions.forEach((_q, qi) => (picked[key(ei, qi)] = false))

const totals = computed(() => {
  let questions = 0
  let exercises = 0
  props.lesson?.exercises.forEach((_ex, ei) => {
    const n = selectedIn(ei)
    if (n) { questions += n; exercises++ }
  })
  return { questions, exercises }
})

const toHand = (h: Hand) => toComponentHand(h)

function doInsert() {
  const lesson = props.lesson
  if (!lesson) return
  const source = quizSourceFromLesson(lesson)
  const embeds = lesson.exercises
    .map((ex, ei) => {
      const qs = ex.questions.filter((_q, qi) => isPicked(ei, qi))
      return qs.length ? buildQuizEmbed(source, ex, qs) : null
    })
    .filter((e): e is QuizEmbed => e !== null)
  if (embeds.length) emit('insert', embeds)
}

// Reset selection when returning to browse.
function back() {
  for (const k of Object.keys(picked)) delete picked[k]
  emit('back')
}
</script>

<template>
  <div class="qp-backdrop" @click.self="emit('close')">
    <div class="qp" role="dialog" aria-label="Insert quiz questions">
      <!-- ============ Phase 1: browse ============ -->
      <template v-if="!lesson">
        <header class="qp__head">
          <div>
            <h2 class="qp__title">Insert a quiz</h2>
            <p class="qp__sub">Pick questions from a Practice-Bidding-Scenarios quiz.</p>
          </div>
          <button class="qp__x" title="Close" @click="emit('close')">×</button>
        </header>

        <div class="qp__body">
          <div v-if="!folderName" class="empty">
            <p class="empty__lead">Point at your <code>quiz/</code> folder to browse all lessons, or open one file.</p>
            <div class="empty__actions">
              <button v-if="supportsFolder" class="btn btn--primary" @click="emit('choose-folder')">Choose quiz folder…</button>
              <button class="btn" @click="emit('open-file')">Open a single file…</button>
            </div>
          </div>

          <template v-else>
            <div class="folder">
              <span class="folder__name"><span class="folder__badge">folder</span> {{ folderName }}</span>
              <span class="folder__actions">
                <button class="linkbtn" @click="emit('choose-folder')">Change</button>
                <button class="linkbtn" @click="emit('forget-folder')">Forget</button>
                <button class="linkbtn" @click="emit('open-file')">Open a file…</button>
              </span>
            </div>

            <p v-if="needsPermission" class="notice">
              Access to this folder was reset on reload.
              <button class="linkbtn" @click="emit('grant-folder')">Grant access</button>
            </p>
            <p v-else-if="error" class="notice notice--err">{{ error }}</p>
            <template v-else>
              <input v-model="filter" class="search" type="search" placeholder="Filter lessons…" />
              <p v-if="!filtered.length" class="notice">No lessons match.</p>
              <ul v-else class="lessons">
                <li v-for="l in filtered" :key="l.id">
                  <button class="lesson" @click="emit('open-lesson', l)">
                    <span class="lesson__title">{{ l.title }}</span>
                    <span class="lesson__counts">
                      <template v-if="l.exercise_count != null">{{ l.exercise_count }} ex</template>
                      <template v-if="l.question_count != null"> · {{ l.question_count }} Q</template>
                    </span>
                  </button>
                </li>
              </ul>
            </template>
          </template>
        </div>

        <footer class="qp__foot">
          <span class="qp__spacer" />
          <button class="btn" @click="emit('close')">Cancel</button>
        </footer>
      </template>

      <!-- ============ Phase 2: pick questions ============ -->
      <template v-else>
        <header class="qp__head">
          <div>
            <h2 class="qp__title">{{ lesson.title }}</h2>
            <p class="qp__sub">
              <button class="linkbtn" @click="back">‹ All lessons</button>
              · {{ lesson.exercises.length }} exercises
            </p>
          </div>
          <button class="qp__x" title="Close" @click="emit('close')">×</button>
        </header>

        <div class="qp__body">
          <section v-for="(ex, ei) in lesson.exercises" :key="ex.id" class="ex">
            <button class="ex__head" @click="expanded[ei] = !expanded[ei]">
              <span class="ex__caret">{{ expanded[ei] ? '▾' : '▸' }}</span>
              <span class="ex__prompt"><SuitText :text="ex.prompt" /></span>
              <span class="ex__count">
                <span v-if="selectedIn(ei)" class="ex__badge">{{ selectedIn(ei) }} selected</span>
                {{ ex.questions.length }} hands
              </span>
            </button>

            <div v-if="expanded[ei]" class="ex__body">
              <div class="ex__actions">
                <button class="linkbtn" @click="selectFirst(ei, 6)">First 6</button>
                <button class="linkbtn" @click="selectFirst(ei, ex.questions.length)">All</button>
                <button class="linkbtn" @click="clearEx(ei)">None</button>
              </div>
              <ul class="qs">
                <li
                  v-for="(q, qi) in ex.questions"
                  :key="qi"
                  class="q"
                  :class="{ 'q--on': isPicked(ei, qi) }"
                  @click="toggle(ei, qi)"
                >
                  <span class="q__check">{{ isPicked(ei, qi) ? '✓' : '' }}</span>
                  <HandDisplay :hand="toHand(q.hand)" :show-hcp="true" />
                  <span class="q__answer"><CallLabel :value="q.answer" /></span>
                </li>
              </ul>
            </div>
          </section>
        </div>

        <footer class="qp__foot">
          <span class="qp__tally">
            {{ totals.questions }} question{{ totals.questions === 1 ? '' : 's' }}
            in {{ totals.exercises }} exercise{{ totals.exercises === 1 ? '' : 's' }}
          </span>
          <span class="qp__spacer" />
          <button class="btn" @click="emit('close')">Cancel</button>
          <button class="btn btn--primary" :disabled="!totals.questions" @click="doInsert">
            Insert {{ totals.exercises > 1 ? `${totals.exercises} blocks` : 'quiz' }}
          </button>
        </footer>
      </template>
    </div>
  </div>
</template>

<style scoped>
.qp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}
.qp {
  display: flex;
  flex-direction: column;
  width: min(52rem, 100%);
  max-height: 100%;
  background: var(--ls-bg);
  border: 1px solid var(--ls-border);
  border-radius: 0.7rem;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.qp__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--ls-border);
}
.qp__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.qp__sub {
  margin: 0.15rem 0 0;
  font-size: 0.85rem;
  color: var(--ls-muted);
}
.qp__x {
  font: inherit;
  font-size: 1.4rem;
  line-height: 1;
  background: none;
  border: none;
  color: var(--ls-muted);
  cursor: pointer;
}
.qp__x:hover { color: var(--ls-fg); }

.qp__body {
  overflow-y: auto;
  padding: 0.75rem 1rem;
  flex: 1;
}

/* phase 1 */
.empty { text-align: center; padding: 2rem 1rem; }
.empty__lead { color: var(--ls-muted); margin: 0 0 1rem; }
.empty__actions { display: flex; gap: 0.6rem; justify-content: center; }
.folder {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.6rem;
  font-size: 0.85rem;
}
.folder__badge {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  padding: 0.08rem 0.35rem;
  border-radius: 0.25rem;
  color: var(--ls-muted);
  background: var(--ls-panel);
  margin-right: 0.4rem;
}
.folder__actions { display: flex; gap: 0.75rem; }
.search {
  width: 100%;
  font: inherit;
  font-size: 0.9rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--ls-border);
  border-radius: 0.4rem;
  margin-bottom: 0.6rem;
  box-sizing: border-box;
}
.lessons { list-style: none; margin: 0; padding: 0; }
.lesson {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  font: inherit;
  text-align: left;
  background: none;
  border: none;
  border-bottom: 1px solid var(--ls-border);
  padding: 0.55rem 0.4rem;
  cursor: pointer;
  color: var(--ls-fg);
}
.lesson:hover { background: var(--ls-panel); }
.lesson__title { font-weight: 550; }
.lesson__counts { flex-shrink: 0; font-size: 0.78rem; color: var(--ls-muted); }
.notice { color: var(--ls-muted); font-size: 0.85rem; margin: 0.5rem 0; }
.notice--err { color: #c81e1e; }

/* phase 2 */
.ex { border-bottom: 1px solid var(--ls-border); }
.ex:last-child { border-bottom: none; }
.ex__head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  font: inherit;
  text-align: left;
  background: none;
  border: none;
  padding: 0.65rem 0.5rem;
  cursor: pointer;
  color: var(--ls-fg);
}
.ex__head:hover { background: var(--ls-panel); }
.ex__caret { color: var(--ls-muted); width: 1rem; flex-shrink: 0; }
.ex__prompt { flex: 1; font-weight: 550; }
.ex__count {
  flex-shrink: 0;
  font-size: 0.8rem;
  color: var(--ls-muted);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.ex__badge {
  color: var(--ls-accent);
  background: color-mix(in srgb, var(--ls-accent) 12%, transparent);
  border-radius: 0.25rem;
  padding: 0.05rem 0.4rem;
  font-weight: 700;
}
.ex__body { padding: 0 0.5rem 0.75rem 1.5rem; }
.ex__actions { display: flex; gap: 0.9rem; margin-bottom: 0.5rem; }
.qs { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.6rem; }
.q {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--ls-border);
  border-radius: 0.5rem;
  cursor: pointer;
}
.q:hover { border-color: var(--ls-accent); }
.q--on { border-color: var(--ls-accent); background: color-mix(in srgb, var(--ls-accent) 8%, transparent); }
.q__check { width: 1rem; flex-shrink: 0; color: var(--ls-accent); font-weight: 700; }
.q__answer { font-weight: 650; margin-left: 0.2rem; }

/* shared */
.linkbtn {
  font: inherit;
  font-size: 0.8rem;
  background: none;
  border: none;
  padding: 0;
  color: var(--ls-accent);
  cursor: pointer;
  text-decoration: underline;
}
.qp__foot {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.8rem 1.25rem;
  border-top: 1px solid var(--ls-border);
}
.qp__tally { font-size: 0.85rem; color: var(--ls-muted); }
.qp__spacer { flex: 1; }
.btn {
  font: inherit;
  font-size: 0.85rem;
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--ls-border);
  border-radius: 0.4rem;
  background: var(--ls-bg);
  color: var(--ls-fg);
  cursor: pointer;
}
.btn:hover { background: var(--ls-panel); }
.btn--primary { background: var(--ls-accent); border-color: var(--ls-accent); color: #fff; }
.btn--primary:disabled { opacity: 0.5; cursor: default; }
</style>
