<script setup lang="ts">
import LessonDocument from './editor/LessonDocument.vue'
import { STARTER_LESSON } from './editor/starter'
</script>

<template>
  <div class="studio">
    <header class="studio__header">
      <h1 class="studio__title">Lesson Studio</h1>
      <span class="studio__subtitle">
        Bridge Classroom lesson authoring — Phase 1 scaffold
      </span>
      <a class="studio__link" href="/print.html">Print view →</a>
      <a class="studio__link" href="/gallery.html">Block gallery →</a>
    </header>
    <main class="studio__body">
      <LessonDocument :markdown="STARTER_LESSON" />
    </main>
  </div>
</template>
