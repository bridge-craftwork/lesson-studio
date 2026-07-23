<script setup lang="ts">
import { computed } from 'vue'
import { blockSchema } from '@/dsl'

// The authorable keys for the block being edited, read from the Contract 1
// schema. Exists because the keys were previously discoverable only by reading
// the parsers or the contract — you cannot use a key you don't know about.
const props = defineProps<{ tag: string }>()

const schema = computed(() => blockSchema(props.tag))
</script>

<template>
  <aside v-if="schema" class="key-ref">
    <div class="key-ref__head">
      <code class="key-ref__tag">{{ schema.tag }}</code>
      <span class="key-ref__summary">{{ schema.summary }}</span>
    </div>

    <dl v-if="schema.keys.length" class="key-ref__keys">
      <template v-for="k in schema.keys" :key="k.name">
        <dt>
          <code class="key-ref__name">{{ k.name }}</code>
          <span v-if="k.required" class="key-ref__req" title="required">*</span>
        </dt>
        <dd>
          <div class="key-ref__values">
            <code>{{ k.values }}</code>
            <span v-if="k.default" class="key-ref__default">default: {{ k.default }}</span>
          </div>
          <div class="key-ref__doc">{{ k.doc }}</div>
        </dd>
      </template>
    </dl>

    <p v-if="schema.bodyDoc" class="key-ref__body">{{ schema.bodyDoc }}</p>
    <p v-if="schema.keys.some((k) => k.required)" class="key-ref__foot">* required</p>
  </aside>
</template>

<style scoped>
.key-ref {
  flex: 1 1 15rem;
  min-width: 13rem;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--ls-text, #222);
  border: 1px solid var(--ls-border, #e4e4e7);
  border-radius: 6px;
  padding: 0.5rem 0.6rem;
  background: var(--ls-panel, #f7f7f8);
  max-height: 22rem;
  overflow-y: auto;
}
.key-ref__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem;
  padding-bottom: 0.4rem;
  margin-bottom: 0.4rem;
  border-bottom: 1px solid var(--ls-border, #e4e4e7);
}
.key-ref__tag {
  font-family: var(--ls-mono, monospace);
  font-weight: 700;
  color: var(--ls-accent, #1d4ed8);
}
.key-ref__summary {
  flex: 1 1 8rem;
  color: var(--ls-muted, #666);
}
.key-ref__keys {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.3rem 0.5rem;
  align-items: baseline;
}
.key-ref__keys dt {
  white-space: nowrap;
}
.key-ref__keys dd {
  margin: 0;
  min-width: 0;
}
.key-ref__name {
  font-family: var(--ls-mono, monospace);
  font-weight: 600;
}
.key-ref__req {
  color: var(--ls-accent, #1d4ed8);
  font-weight: 700;
}
.key-ref__values {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: baseline;
}
.key-ref__values code {
  font-family: var(--ls-mono, monospace);
  color: var(--ls-muted, #666);
}
.key-ref__default {
  color: var(--ls-muted, #888);
  font-style: italic;
}
.key-ref__doc {
  color: var(--ls-muted, #666);
}
.key-ref__body,
.key-ref__foot {
  margin: 0.5rem 0 0;
  color: var(--ls-muted, #666);
}
.key-ref__foot {
  color: var(--ls-muted, #888);
}
</style>
