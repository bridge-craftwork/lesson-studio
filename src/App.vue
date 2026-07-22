<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import LessonDocument from './editor/LessonDocument.vue'
import { useLessonSession } from './lesson/useLessonSession'

// Resolve sibling pages against the deploy base ('/' locally,
// '/lesson-studio/' on GitHub Pages) so links work in both.
const base = import.meta.env.BASE_URL

const session = useLessonSession()

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

// The Drafts <details> behaves like a menu: picking a draft closes it, as does
// clicking outside. (Deleting leaves it open — you may be pruning several.)
const draftsMenu = ref<HTMLDetailsElement | null>(null)

function closeDrafts() {
  if (draftsMenu.value) draftsMenu.value.open = false
}

function restoreDraft(id: string) {
  session.restoreDraft(id)
  closeDrafts()
}

function onDocumentPointerDown(event: PointerEvent) {
  const menu = draftsMenu.value
  if (menu?.open && !menu.contains(event.target as Node)) closeDrafts()
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))
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

        <details ref="draftsMenu" class="drafts">
          <summary>Drafts</summary>
          <div class="drafts__menu">
            <p v-if="!session.drafts.value.length" class="drafts__empty">No drafts yet.</p>
            <ul v-else>
              <li v-for="d in session.drafts.value" :key="d.id">
                <button class="drafts__restore" @click="restoreDraft(d.id)">
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

      <a class="studio__link" :href="`${base}print.html`" target="_blank" @click="session.stashForPrint()">Print →</a>
      <a class="studio__link" :href="`${base}gallery.html`" target="_blank">Gallery →</a>
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
