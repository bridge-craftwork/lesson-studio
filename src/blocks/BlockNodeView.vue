<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useNodeViewContext } from '@prosemirror-adapter/vue'
import BlockView from '../render/BlockView.vue'
import type { ReservedBlock } from '@/dsl'

// Generic node view for every reserved DSL block: renders the shared read-only
// BlockView, plus an "edit source" affordance. Editing swaps in a text area for
// the block's DSL body with a live preview beside it; applying writes the body
// back to the node's attrs, which flows out to markdown (and dirty/autosave).
const { node, selected, setAttrs, view } = useNodeViewContext()

const tag = computed(() => node.value.type.name as ReservedBlock)
const body = computed(() => (node.value.attrs.body as string) ?? '')

const editing = ref(false)
const draft = ref('')
const textarea = ref<HTMLTextAreaElement | null>(null)

// No editing affordance in the read-only print view.
const canEdit = computed(() => view.editable !== false)

// Preview what's being typed, so parse errors surface immediately.
const previewBody = computed(() => (editing.value ? draft.value : body.value))
const rows = computed(() => Math.min(Math.max(draft.value.split('\n').length + 1, 4), 24))

async function startEdit() {
  if (!canEdit.value) return
  draft.value = body.value
  editing.value = true
  await nextTick()
  textarea.value?.focus()
}

function apply() {
  if (!editing.value) return
  editing.value = false
  if (draft.value !== body.value) setAttrs({ body: draft.value })
}

function cancel() {
  editing.value = false
  draft.value = body.value
}
</script>

<template>
  <div
    class="reserved-block"
    :class="[`reserved-block--${tag}`, { 'is-selected': selected, 'is-editing': editing }]"
    contenteditable="false"
  >
    <div v-if="editing" class="block-edit" data-block-source>
      <div class="block-edit__bar">
        <code class="block-edit__tag">{{ tag }}</code>
        <span class="block-edit__hint">Esc to cancel · ⌘/Ctrl+Enter to apply</span>
        <button class="block-edit__btn" @click="cancel">Cancel</button>
        <button class="block-edit__btn block-edit__btn--primary" @click="apply">Done</button>
      </div>
      <div class="block-edit__panes">
        <textarea
          ref="textarea"
          v-model="draft"
          class="block-edit__source"
          spellcheck="false"
          :rows="rows"
          @keydown.esc.stop.prevent="cancel"
          @keydown.enter.meta.stop.prevent="apply"
          @keydown.enter.ctrl.stop.prevent="apply"
        />
        <div class="block-edit__preview"><BlockView :tag="tag" :body="previewBody" /></div>
      </div>
    </div>

    <template v-else>
      <BlockView :tag="tag" :body="body" />
      <button v-if="canEdit" class="block-edit__open" title="Edit source" @click="startEdit">
        ✎
      </button>
    </template>
  </div>
</template>

<style scoped>
.reserved-block {
  position: relative;
  margin: 0.5rem 0;
  padding: 0.25rem;
  border-radius: 8px;
}
.reserved-block.is-selected {
  outline: 2px solid var(--ls-accent, #1d4ed8);
}

/* Edit affordance: quiet until you hover the block (or it's selected). */
.block-edit__open {
  position: absolute;
  top: 0.1rem;
  right: 0.1rem;
  opacity: 0;
  transition: opacity 0.12s;
  border: 1px solid var(--ls-border, #e4e4e7);
  background: var(--ls-bg, #fff);
  color: var(--ls-muted, #666);
  border-radius: 6px;
  font-size: 0.75rem;
  line-height: 1;
  padding: 0.2rem 0.35rem;
  cursor: pointer;
}
.reserved-block:hover .block-edit__open,
.reserved-block.is-selected .block-edit__open {
  opacity: 1;
}
.block-edit__open:hover {
  color: var(--ls-accent, #1d4ed8);
  border-color: var(--ls-accent, #1d4ed8);
}

.block-edit {
  border: 1px solid var(--ls-accent, #1d4ed8);
  border-radius: 8px;
  overflow: hidden;
}
.block-edit__bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  background: var(--ls-panel, #f7f7f8);
  border-bottom: 1px solid var(--ls-border, #e4e4e7);
}
.block-edit__tag {
  font-family: var(--ls-mono, monospace);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ls-accent, #1d4ed8);
}
.block-edit__hint {
  flex: 1;
  font-size: 0.7rem;
  color: var(--ls-muted, #888);
}
.block-edit__btn {
  font: inherit;
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border: 1px solid var(--ls-border, #e4e4e7);
  border-radius: 5px;
  background: var(--ls-bg, #fff);
  cursor: pointer;
}
.block-edit__btn--primary {
  background: var(--ls-accent, #1d4ed8);
  border-color: var(--ls-accent, #1d4ed8);
  color: #fff;
}
.block-edit__panes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.6rem;
  align-items: flex-start;
}
.block-edit__source {
  flex: 1 1 18rem;
  min-width: 14rem;
  font-family: var(--ls-mono, monospace);
  font-size: 0.8rem;
  line-height: 1.45;
  padding: 0.5rem;
  border: 1px solid var(--ls-border, #e4e4e7);
  border-radius: 6px;
  resize: vertical;
}
.block-edit__source:focus {
  outline: 2px solid var(--ls-accent, #1d4ed8);
  outline-offset: -1px;
}
.block-edit__preview {
  flex: 1 1 16rem;
  min-width: 12rem;
}
</style>
