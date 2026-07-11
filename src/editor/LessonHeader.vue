<script setup lang="ts">
/**
 * Renders parsed lesson front matter (Contract 4) as a document header, instead
 * of showing the raw YAML in the editor surface. Read-only for now; a
 * front-matter editing panel is a later step.
 */
import type { FrontMatter } from '@/dsl'

defineProps<{ data: Partial<FrontMatter> | null }>()
</script>

<template>
  <header v-if="data" class="lesson-header">
    <div class="lesson-header__top">
      <h1 class="lesson-header__title">{{ data.title ?? 'Untitled lesson' }}</h1>
      <span v-if="data.level" class="pill" :class="`pill--${data.level}`">{{ data.level }}</span>
    </div>
    <ul v-if="data.skill_paths?.length" class="lesson-header__paths">
      <li v-for="path in data.skill_paths" :key="path" class="tag" :class="{ 'tag--primary': path === data.primary }">
        {{ path }}
      </li>
    </ul>
    <div class="lesson-header__meta">
      <span v-if="data.author">by {{ data.author }}</span>
      <span v-if="data.status" class="status" :class="`status--${data.status}`">{{ data.status }}</span>
      <span v-if="data['reviewed-by']">reviewed-by: {{ data['reviewed-by'] }}</span>
    </div>
  </header>
</template>

<style scoped>
.lesson-header {
  border-bottom: 1px solid var(--ls-border, #e4e4e7);
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}
.lesson-header__top {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}
.lesson-header__title {
  margin: 0;
  font-size: 1.6rem;
}
.pill {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--ls-panel, #eef);
  color: var(--ls-muted, #555);
}
.lesson-header__paths {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.6rem 0 0;
  padding: 0;
}
.tag {
  font-family: var(--ls-mono, monospace);
  font-size: 0.72rem;
  padding: 0.12rem 0.5rem;
  border-radius: 5px;
  background: var(--ls-panel, #f2f2f4);
  color: var(--ls-muted, #555);
}
.tag--primary {
  background: color-mix(in srgb, var(--ls-accent, #1d4ed8) 14%, transparent);
  color: var(--ls-accent, #1d4ed8);
  font-weight: 600;
}
.lesson-header__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.6rem;
  font-size: 0.78rem;
  color: var(--ls-muted, #666);
}
.status {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.68rem;
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
}
.status--published {
  background: #e6f4ea;
  color: #1e7a3c;
}
.status--draft {
  background: #fdf0e3;
  color: #a5631a;
}
</style>
