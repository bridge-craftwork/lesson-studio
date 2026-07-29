<script setup lang="ts">
import { ref } from 'vue'
import LessonDocument from './editor/LessonDocument.vue'
import EditorRibbon from './editor/EditorRibbon.vue'
import Lobby from './editor/Lobby.vue'
import UserGuide from './editor/UserGuide.vue'
import QuizPicker from './editor/QuizPicker.vue'
import PagePreview from './print/PagePreview.vue'
import { useLessonSession } from './lesson/useLessonSession'
import { useQuizSource } from './lesson/useQuizSource'
import type { HistoryEntry } from './lesson/history'
import { serializeQuizBlock, type QuizLesson, type QuizEmbed, type QuizManifestEntry } from '@/dsl'

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

// The User Guide overlays the Lobby. It's ephemeral UI state, deliberately not a
// session location — a reload returns to the Lobby, never into the guide.
const guideOpen = ref(false)

// Quiz picker: a remembered PBS quiz/ folder + manifest (phase 1), then browse a
// lesson's exercises and insert selected questions as quiz blocks (phase 2).
const quiz = useQuizSource()
const quizLesson = ref<QuizLesson | null>(null)
const quizPickerOpen = ref(false)

async function openQuizPicker() {
  await quiz.refresh()
  quizLesson.value = null
  quizPickerOpen.value = true
}

async function onOpenLesson(entry: QuizManifestEntry) {
  try {
    quizLesson.value = await quiz.openLesson(entry)
  } catch (err) {
    window.alert(`Couldn't open ${entry.file}:\n${err instanceof Error ? err.message : err}`)
  }
}

async function onOpenQuizFile() {
  try {
    const lesson = await quiz.openSingleFile()
    if (lesson) quizLesson.value = lesson
  } catch (err) {
    window.alert(`Not a usable quiz file:\n${err instanceof Error ? err.message : err}`)
  }
}

function insertQuizzes(embeds: QuizEmbed[]) {
  for (const embed of embeds) lessonDoc.value?.insertBlock('quiz', serializeQuizBlock(embed))
  quizPickerOpen.value = false
  quizLesson.value = null
}

// A History entry reconstitutes from its autosave draft (Phase A). Recent files
// with persisted handles re-open by handleKey in a later phase.
function restoreHistory(entry: HistoryEntry) {
  if (entry.draftId) session.restoreDraft(entry.draftId)
}
</script>

<template>
  <UserGuide v-if="session.location.value === 'lobby' && guideOpen" @close="guideOpen = false" />

  <Lobby
    v-else-if="session.location.value === 'lobby'"
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
    @open-guide="guideOpen = true"
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

    <EditorRibbon :doc="lessonDoc" @pick-quiz="openQuizPicker" />

    <QuizPicker
      v-if="quizPickerOpen"
      :lesson="quizLesson"
      :manifest="quiz.manifest.value"
      :folder-name="quiz.dir.value?.name ?? null"
      :needs-permission="quiz.needsPermission.value"
      :supports-folder="quiz.supportsFolder"
      :error="quiz.error.value"
      @insert="insertQuizzes"
      @close="quizPickerOpen = false; quizLesson = null"
      @choose-folder="quiz.chooseFolder()"
      @grant-folder="quiz.grant()"
      @forget-folder="quiz.forget()"
      @open-file="onOpenQuizFile"
      @open-lesson="onOpenLesson"
      @back="quizLesson = null"
    />

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
