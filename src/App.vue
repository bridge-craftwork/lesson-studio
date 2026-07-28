<script setup lang="ts">
import { ref } from 'vue'
import LessonDocument from './editor/LessonDocument.vue'
import EditorRibbon from './editor/EditorRibbon.vue'
import Lobby from './editor/Lobby.vue'
import PagePreview from './print/PagePreview.vue'
import { useLessonSession } from './lesson/useLessonSession'
import type { HistoryEntry } from './lesson/history'

// Resolve sibling pages against the deploy base ('/' locally,
// '/lesson-studio/' on GitHub Pages) so links work in both.
const base = import.meta.env.BASE_URL

const session = useLessonSession()

// Column layout is a print concern (architecture Non-Goal: authors edit
// single-column flow), so the preview is where you see it — and where you find
// out whether the lesson still fits on one page. Off by default; the editor
// stays full width until you ask.
const showPreview = ref(false)
const lessonDoc = ref<InstanceType<typeof LessonDocument> | null>(null)

// A History entry reconstitutes from its autosave draft (Phase A). Recent files
// with persisted handles re-open by handleKey in a later phase.
function restoreHistory(entry: HistoryEntry) {
  if (entry.draftId) session.restoreDraft(entry.draftId)
}
</script>

<template>
  <Lobby
    v-if="session.location.value === 'lobby'"
    :drafts="session.drafts.value"
    :favorites="session.favorites.value"
    :library-dir="session.libraryDir.value"
    :library-lessons="session.libraryLessons.value"
    :library-needs-permission="session.libraryNeedsPermission.value"
    :supports-directory-picker="session.supportsDirectoryPicker"
    @open-template="session.openTemplate"
    @open-file="session.open()"
    @restore="restoreHistory"
    @delete-draft="session.deleteDraft"
    @open-handle="session.openHandle"
    @toggle-favorite="session.toggleFavorite"
    @choose-library="session.chooseLibrary()"
    @grant-library="session.grantLibrary()"
    @forget-library="session.forgetLibrary()"
  />

  <div v-else class="studio">
    <header class="studio__header">
      <h1 class="studio__title">Lesson Studio</h1>

      <div class="toolbar">
        <button class="studio__close" title="Close this lesson and return to the Lobby" @click="session.close()">‹ Close</button>
        <span class="toolbar__sep" />
        <button @click="session.open()">Open…</button>
        <button @click="session.save()">
          {{ session.canSaveInPlace.value ? 'Save' : 'Save…' }}
        </button>
        <button @click="session.saveAs()">Save As…</button>
      </div>

      <span class="studio__file">
        <span class="dirty" :class="{ 'dirty--on': session.dirty.value }" :title="session.dirty.value ? 'Unsaved changes' : 'Saved'" />
        {{ session.fileName.value }}
      </span>

      <button
        class="studio__toggle"
        :class="{ 'is-on': showPreview }"
        :aria-pressed="showPreview"
        title="Show the print layout, with real columns and page count"
        @click="showPreview = !showPreview"
      >
        Preview
      </button>
      <a class="studio__link" :href="`${base}print.html`" target="_blank" @click="session.stashForPrint()">Print →</a>
      <a class="studio__link" :href="`${base}gallery.html`" target="_blank">Gallery →</a>
    </header>

    <EditorRibbon :doc="lessonDoc" />

    <main class="studio__body" :class="{ 'studio__body--split': showPreview }">
      <div class="studio__edit">
        <LessonDocument
          ref="lessonDoc"
          :key="session.loadId.value"
          :markdown="session.loadedMarkdown.value"
          @update:markdown="session.onEdit"
        />
      </div>
      <PagePreview v-if="showPreview" class="studio__preview" :markdown="session.liveMarkdown.value" />
    </main>
  </div>
</template>
