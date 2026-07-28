<script setup lang="ts">
/**
 * The Lobby — the studio's neutral home. Not a document and not a template
 * masquerading as one: a place to *choose* what to work on. It offers starting
 * points, not a file browser (see documentation/lobby-and-session.md):
 * Templates, a merged History of drafts + recent files, and Open….
 */
import { computed } from 'vue'
import { TEMPLATES } from '../lesson/templates'
import { listHistory, type HistoryEntry } from '../lesson/history'
import type { Draft } from '../lesson/drafts'

// `drafts` is passed in so the list re-renders whenever the session's reactive
// drafts change (delete, autosave); listHistory() reads the same store.
const props = defineProps<{ drafts: Draft[] }>()

const emit = defineEmits<{
  (e: 'open-template', id: string): void
  (e: 'open-file'): void
  (e: 'restore', entry: HistoryEntry): void
  (e: 'delete-draft', id: string): void
}>()

// Recompute from the store keyed on the reactive drafts length/updatedAt so a
// delete or autosave refreshes the list.
const history = computed<HistoryEntry[]>(() => {
  void props.drafts
  return listHistory()
})

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<template>
  <div class="lobby">
    <div class="lobby__inner">
      <header class="lobby__head">
        <h1 class="lobby__brand">Lesson Studio</h1>
        <p class="lobby__tagline">One-page bridge lessons. Pick up where you left off, or start fresh.</p>
      </header>

      <section class="lobby__section">
        <h2 class="lobby__h">Start a lesson</h2>
        <div class="lobby__templates">
          <button
            v-for="t in TEMPLATES"
            :key="t.id"
            class="tmpl"
            @click="emit('open-template', t.id)"
          >
            <span class="tmpl__badge">Template</span>
            <span class="tmpl__name">{{ t.name }}</span>
            <span class="tmpl__blurb">{{ t.blurb }}</span>
          </button>
          <button class="tmpl tmpl--open" @click="emit('open-file')">
            <span class="tmpl__badge tmpl__badge--muted">File</span>
            <span class="tmpl__name">Open…</span>
            <span class="tmpl__blurb">Open a lesson <code>.md</code> from disk (e.g. a lesson-library checkout).</span>
          </button>
        </div>
      </section>

      <section class="lobby__section">
        <h2 class="lobby__h">Recent</h2>
        <p v-if="!history.length" class="lobby__empty">
          Nothing yet. Work you start autosaves here — nothing is lost when you Close.
        </p>
        <ul v-else class="hist">
          <li v-for="entry in history" :key="entry.key" class="hist__row">
            <button class="hist__open" @click="emit('restore', entry)">
              <span class="hist__title">{{ entry.title || 'Untitled' }}</span>
              <span class="hist__meta">
                <span class="hist__kind" :class="`hist__kind--${entry.kind}`">{{ entry.kind }}</span>
                <span class="hist__time">{{ formatTime(entry.updatedAt) }}</span>
              </span>
            </button>
            <button
              v-if="entry.draftId"
              class="hist__del"
              title="Remove from history"
              @click="emit('delete-draft', entry.draftId)"
            >×</button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.lobby {
  height: 100%;
  overflow-y: auto;
  background: var(--ls-bg);
}
.lobby__inner {
  max-width: 56rem;
  margin: 0 auto;
  padding: 3rem 1.5rem 4rem;
}
.lobby__head {
  margin-bottom: 2.5rem;
}
.lobby__brand {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
}
.lobby__tagline {
  margin: 0.35rem 0 0;
  color: var(--ls-muted);
}
.lobby__section {
  margin-bottom: 2.5rem;
}
.lobby__h {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ls-muted);
  margin: 0 0 0.9rem;
}

.lobby__templates {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 0.75rem;
}
.tmpl {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
  text-align: left;
  font: inherit;
  padding: 1rem;
  border: 1px solid var(--ls-border);
  border-radius: 0.6rem;
  background: var(--ls-bg);
  color: var(--ls-fg);
  cursor: pointer;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.tmpl:hover {
  border-color: var(--ls-accent);
  box-shadow: 0 1px 6px rgb(29 78 216 / 0.08);
}
.tmpl--open {
  border-style: dashed;
}
.tmpl__badge {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-weight: 700;
  color: var(--ls-accent);
  background: color-mix(in srgb, var(--ls-accent) 12%, transparent);
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
}
.tmpl__badge--muted {
  color: var(--ls-muted);
  background: var(--ls-panel);
}
.tmpl__name {
  font-weight: 650;
  font-size: 1.05rem;
}
.tmpl__blurb {
  color: var(--ls-muted);
  font-size: 0.85rem;
  line-height: 1.35;
}
.tmpl__blurb code {
  font-family: var(--ls-mono);
  font-size: 0.9em;
}

.lobby__empty {
  color: var(--ls-muted);
  font-size: 0.9rem;
  margin: 0;
}
.hist {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--ls-border);
  border-radius: 0.6rem;
  overflow: hidden;
}
.hist__row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--ls-border);
}
.hist__row:last-child {
  border-bottom: none;
}
.hist__open {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font: inherit;
  text-align: left;
  padding: 0.7rem 1rem;
  background: transparent;
  border: none;
  color: var(--ls-fg);
  cursor: pointer;
}
.hist__open:hover {
  background: var(--ls-panel);
}
.hist__title {
  font-weight: 550;
}
.hist__meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}
.hist__kind {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  padding: 0.08rem 0.35rem;
  border-radius: 0.25rem;
  color: var(--ls-muted);
  background: var(--ls-panel);
}
.hist__kind--file {
  color: var(--ls-accent);
  background: color-mix(in srgb, var(--ls-accent) 12%, transparent);
}
.hist__time {
  font-size: 0.78rem;
  color: var(--ls-muted);
}
.hist__del {
  font: inherit;
  font-size: 1.1rem;
  line-height: 1;
  padding: 0 0.85rem;
  background: transparent;
  border: none;
  border-left: 1px solid var(--ls-border);
  color: var(--ls-muted);
  cursor: pointer;
}
.hist__del:hover {
  background: var(--ls-panel);
  color: var(--ls-fg);
}
</style>
