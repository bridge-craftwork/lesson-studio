<script setup lang="ts">
/**
 * The Lobby — the studio's neutral home. Not a document and not a template
 * masquerading as one: a place to *choose* what to work on. It offers starting
 * points, not a file browser (see documentation/lobby-and-session.md):
 * Templates, Favorites, a lesson-library listing, a merged History, and Open….
 */
import { computed } from 'vue'
import { TEMPLATES } from '../lesson/templates'
import { listHistory, type HistoryEntry } from '../lesson/history'
import type { Draft } from '../lesson/drafts'
import type { HandleEntry } from '../lesson/handles'
import type { LibraryLesson } from '../lesson/lessonLibrary'
import type { FileHandle } from '../lesson/files'

const props = defineProps<{
  drafts: Draft[]
  favorites: HandleEntry[]
  libraryDir: HandleEntry | null
  libraryLessons: LibraryLesson[]
  libraryNeedsPermission: boolean
  supportsDirectoryPicker: boolean
}>()

const emit = defineEmits<{
  (e: 'open-template', id: string): void
  (e: 'open-file'): void
  (e: 'restore', entry: HistoryEntry): void
  (e: 'delete-draft', id: string): void
  (e: 'open-handle', handle: FileHandle): void
  (e: 'toggle-favorite', key: string, favorite: boolean): void
  (e: 'choose-library'): void
  (e: 'grant-library'): void
  (e: 'forget-library'): void
}>()

// Recompute from the store keyed on the reactive drafts so a delete or autosave
// refreshes the list.
const history = computed<HistoryEntry[]>(() => {
  void props.drafts
  return listHistory()
})

// Which History `file` rows are already favorited (by handle key).
const favoriteKeys = computed(() => new Set(props.favorites.map((f) => f.key)))

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

      <section v-if="favorites.length" class="lobby__section">
        <h2 class="lobby__h">Favorites</h2>
        <ul class="hist">
          <li v-for="fav in favorites" :key="fav.key" class="hist__row">
            <button class="hist__open" @click="emit('open-handle', fav.handle as FileHandle)">
              <span class="hist__title">{{ fav.name }}</span>
              <span class="hist__meta">
                <span class="hist__kind hist__kind--file">file</span>
              </span>
            </button>
            <button class="hist__star is-on" title="Remove from Favorites" @click="emit('toggle-favorite', fav.key, false)">★</button>
          </li>
        </ul>
      </section>

      <section v-if="supportsDirectoryPicker || libraryDir" class="lobby__section">
        <div class="lobby__hrow">
          <h2 class="lobby__h">Lesson library</h2>
          <div class="lobby__hactions" v-if="libraryDir">
            <button class="linkbtn" @click="emit('choose-library')">Change folder…</button>
            <button class="linkbtn" @click="emit('forget-library')">Forget</button>
          </div>
        </div>

        <p v-if="!libraryDir" class="lobby__empty">
          Point the studio at your <code>lesson-library/lessons</code> folder to list its lessons here.
          <button class="linkbtn" @click="emit('choose-library')">Choose folder…</button>
        </p>

        <template v-else>
          <p class="lobby__dir"><span class="lobby__kind">folder</span> {{ libraryDir.name }}</p>
          <p v-if="libraryNeedsPermission" class="lobby__empty">
            Access to this folder was reset on reload.
            <button class="linkbtn" @click="emit('grant-library')">Grant access</button>
          </p>
          <p v-else-if="!libraryLessons.length" class="lobby__empty">No <code>.md</code> lessons found in this folder.</p>
          <ul v-else class="hist">
            <li v-for="lesson in libraryLessons" :key="lesson.slug" class="hist__row">
              <button class="hist__open" @click="emit('open-handle', lesson.fileHandle)">
                <span class="hist__title">{{ lesson.name }}</span>
                <span class="hist__meta"><span class="hist__kind hist__kind--file">library</span></span>
              </button>
            </li>
          </ul>
        </template>
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
              v-if="entry.handleKey"
              class="hist__star"
              :class="{ 'is-on': favoriteKeys.has(entry.handleKey) }"
              :title="favoriteKeys.has(entry.handleKey) ? 'Remove from Favorites' : 'Add to Favorites'"
              @click="emit('toggle-favorite', entry.handleKey, !favoriteKeys.has(entry.handleKey))"
            >{{ favoriteKeys.has(entry.handleKey) ? '★' : '☆' }}</button>
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
.lobby__hrow {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}
.lobby__hactions {
  display: flex;
  gap: 0.75rem;
}
.linkbtn {
  font: inherit;
  font-size: 0.82rem;
  background: none;
  border: none;
  padding: 0;
  color: var(--ls-accent);
  cursor: pointer;
  text-decoration: underline;
}
.lobby__dir {
  margin: 0 0 0.6rem;
  font-size: 0.85rem;
  color: var(--ls-fg);
}
.lobby__kind,
.lobby__dir .lobby__kind {
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
.tmpl__blurb code,
.lobby__empty code,
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
.hist__star {
  font: inherit;
  font-size: 1rem;
  line-height: 1;
  padding: 0 0.6rem;
  background: transparent;
  border: none;
  border-left: 1px solid var(--ls-border);
  color: var(--ls-muted);
  cursor: pointer;
}
.hist__star.is-on {
  color: #eab308;
}
.hist__star:hover {
  background: var(--ls-panel);
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
