<script setup lang="ts">
import BlockView from '../render/BlockView.vue'
import { GALLERY } from './specimens'
</script>

<template>
  <div class="gallery">
    <header class="gallery__header">
      <h1>Bridge Block Gallery</h1>
      <p>
        Every Phase-1 DSL block, rendered from fixed source through the same
        parser + component path a lesson uses. Left: the DSL an author writes.
        Right: the rendered block.
      </p>
    </header>

    <section v-for="group in GALLERY" :key="group.tag" class="group">
      <div class="group__head">
        <code class="group__tag">{{ group.title }}</code>
        <span class="group__blurb">{{ group.blurb }}</span>
      </div>

      <div class="specimens">
        <div v-for="spec in group.specimens" :key="spec.label" class="specimen">
          <div class="specimen__label">{{ spec.label }}</div>
          <pre class="specimen__source"><code>{{ spec.body || '(empty)' }}</code></pre>
          <div class="specimen__render">
            <BlockView :tag="group.tag" :body="spec.body" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.gallery {
  max-width: 68rem;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}
.gallery__header h1 {
  margin: 0 0 0.25rem;
  font-size: 1.4rem;
}
.gallery__header p {
  margin: 0 0 1.5rem;
  color: var(--ls-muted, #666);
  max-width: 44rem;
}
.group {
  margin-bottom: 2.5rem;
  border-top: 2px solid var(--ls-border, #e4e4e7);
  padding-top: 1rem;
}
.group__head {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.group__tag {
  font-family: var(--ls-mono, monospace);
  font-weight: 700;
  font-size: 1rem;
  color: var(--ls-accent, #1d4ed8);
}
.group__blurb {
  font-size: 0.85rem;
  color: var(--ls-muted, #666);
}
.specimens {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.specimen {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 1rem;
  align-items: start;
  padding: 1rem;
  border: 1px solid var(--ls-border, #e4e4e7);
  border-radius: 10px;
  background: var(--ls-bg, #fff);
}
.specimen__label {
  grid-column: 1 / -1;
  font-size: 0.75rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ls-muted, #666);
}
.specimen__source {
  margin: 0;
  padding: 0.75rem;
  background: var(--ls-panel, #f7f7f8);
  border-radius: 6px;
  font-family: var(--ls-mono, monospace);
  font-size: 0.8rem;
  line-height: 1.45;
  overflow-x: auto;
  white-space: pre;
}
.specimen__render {
  display: flex;
  align-items: center;
  min-height: 3rem;
}

@media (max-width: 640px) {
  .specimen {
    grid-template-columns: 1fr;
  }
}
</style>
