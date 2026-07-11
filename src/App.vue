<script setup lang="ts">
import LessonDocument from './editor/LessonDocument.vue'
import { useLessonSession } from './lesson/useLessonSession'

// Resolve sibling pages against the deploy base ('/' locally,
// '/lesson-studio/' on GitHub Pages) so links work in both.
const base = import.meta.env.BASE_URL

const session = useLessonSession()

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<template>
  <div class="studio">
    <header class="studio__header">
      <h1 class="studio__title">Lesson Studio</h1>

      <div class="toolbar">
        <button @click="session.newLesson()">New</button>
        <button @click="session.open()">Open…</button>
        <button @click="session.save()">
          {{ session.canSaveInPlace.value ? 'Save' : 'Save…' }}
        </button>
        <button @click="session.saveAs()">Save As…</button>

        <details class="drafts">
          <summary>Drafts</summary>
          <div class="drafts__menu">
            <p v-if="!session.drafts.value.length" class="drafts__empty">No drafts yet.</p>
            <ul v-else>
              <li v-for="d in session.drafts.value" :key="d.id">
                <button class="drafts__restore" @click="session.restoreDraft(d.id)">
                  <span class="drafts__title">{{ d.title }}</span>
                  <span class="drafts__time">{{ formatTime(d.updatedAt) }}</span>
                </button>
                <button class="drafts__delete" title="Delete draft" @click="session.deleteDraft(d.id)">×</button>
              </li>
            </ul>
          </div>
        </details>
      </div>

      <span class="studio__file">
        <span class="dirty" :class="{ 'dirty--on': session.dirty.value }" :title="session.dirty.value ? 'Unsaved changes' : 'Saved'" />
        {{ session.fileName.value }}
      </span>

      <a class="studio__link" :href="`${base}print.html`">Print →</a>
      <a class="studio__link" :href="`${base}gallery.html`">Gallery →</a>
    </header>

    <main class="studio__body">
      <LessonDocument
        :key="session.loadId.value"
        :markdown="session.loadedMarkdown.value"
        @update:markdown="session.onEdit"
      />
    </main>
  </div>
</template>
