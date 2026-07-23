<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useNodeViewContext } from '@prosemirror-adapter/vue'
import BlockView from '../render/BlockView.vue'
import BlockKeyReference from './BlockKeyReference.vue'
import { completions, type ReservedBlock } from '@/dsl'

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

// --- key autocomplete -------------------------------------------------------
// Offers the block's Contract 1 keys while typing one. Only fires in key
// position — the start of a line, nothing but letters typed, no colon yet — so
// it never interrupts a holding, a call, or a response-box row.
const caret = ref(0)
const chosen = ref(0)

/** The partial key under the caret, or null if the caret isn't in key position. */
const keyPrefix = computed(() => {
  if (!editing.value) return null
  const upto = draft.value.slice(0, caret.value)
  const line = upto.slice(upto.lastIndexOf('\n') + 1)
  return /^[A-Za-z-]*$/.test(line) ? line : null
})

const suggestions = computed(() =>
  keyPrefix.value === null ? [] : completions(tag.value, keyPrefix.value)
)

// An exact, complete key needs no menu — you've already typed it.
const showSuggestions = computed(
  () =>
    suggestions.value.length > 0 &&
    !(suggestions.value.length === 1 && suggestions.value[0].name === keyPrefix.value)
)

function syncCaret(e: Event) {
  caret.value = (e.target as HTMLTextAreaElement).selectionStart ?? 0
  chosen.value = 0
}

function accept(index = chosen.value) {
  const pick = suggestions.value[index]
  if (!pick || keyPrefix.value === null) return
  const start = caret.value - keyPrefix.value.length
  const insert = `${pick.name}: `
  draft.value = draft.value.slice(0, start) + insert + draft.value.slice(caret.value)
  const at = start + insert.length
  caret.value = at
  nextTick(() => textarea.value?.setSelectionRange(at, at))
}

function move(delta: number) {
  const n = suggestions.value.length
  if (n) chosen.value = (chosen.value + delta + n) % n
}

// Esc closes the menu first and only cancels the edit once it's gone; Tab and
// Enter accept a suggestion rather than indenting or breaking the line.
function onKeydown(e: KeyboardEvent) {
  if (!showSuggestions.value) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel() }
    return
  }
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
  else if (e.key === 'Tab' || (e.key === 'Enter' && !e.metaKey && !e.ctrlKey)) {
    e.preventDefault()
    accept()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    caret.value = -1
  }
}
</script>

<template>
  <div
    class="reserved-block"
    :class="[`reserved-block--${tag}`, { 'is-selected': selected, 'is-editing': editing }]"
    contenteditable="false"
    :data-block-tag="tag"
    :data-block-body="body"
  >
    <div v-if="editing" class="block-edit" data-block-source>
      <div class="block-edit__bar">
        <code class="block-edit__tag">{{ tag }}</code>
        <span class="block-edit__hint">Esc to cancel · ⌘/Ctrl+Enter to apply</span>
        <button class="block-edit__btn" @click="cancel">Cancel</button>
        <button class="block-edit__btn block-edit__btn--primary" @click="apply">Done</button>
      </div>
      <div class="block-edit__panes">
        <div class="block-edit__editor">
          <textarea
            ref="textarea"
            v-model="draft"
            class="block-edit__source"
            spellcheck="false"
            :rows="rows"
            @input="syncCaret"
            @keyup="syncCaret"
            @click="syncCaret"
            @blur="caret = -1"
            @keydown="onKeydown"
            @keydown.enter.meta.stop.prevent="apply"
            @keydown.enter.ctrl.stop.prevent="apply"
          />
          <ul v-if="showSuggestions" class="block-edit__ac">
            <li
              v-for="(s, i) in suggestions"
              :key="s.name"
              class="block-edit__ac-item"
              :class="{ 'is-active': i === chosen }"
              @mousedown.prevent="accept(i)"
              @mouseenter="chosen = i"
            >
              <code class="block-edit__ac-name">{{ s.name }}</code>
              <code class="block-edit__ac-values">{{ s.values }}</code>
              <span v-if="s.default" class="block-edit__ac-default">({{ s.default }})</span>
              <span class="block-edit__ac-doc">{{ s.doc }}</span>
            </li>
          </ul>
        </div>
        <div class="block-edit__preview"><BlockView :tag="tag" :body="previewBody" /></div>
        <BlockKeyReference :tag="tag" />
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
.block-edit__editor {
  flex: 1 1 18rem;
  min-width: 14rem;
  position: relative;
  display: flex;
}
.block-edit__source {
  flex: 1;
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

/* Autocomplete menu. Anchored under the source box rather than tracking the
   caret: the textarea gives no caret coordinates without a mirror element, and
   the blocks are short enough that a fixed anchor is never far from the eye. */
.block-edit__ac {
  position: absolute;
  z-index: 30;
  top: 100%;
  left: 0;
  right: 0;
  margin: 0.15rem 0 0;
  padding: 0.15rem;
  list-style: none;
  background: var(--ls-bg, #fff);
  border: 1px solid var(--ls-accent, #1d4ed8);
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  max-height: 13rem;
  overflow-y: auto;
}
.block-edit__ac-item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem;
  padding: 0.2rem 0.35rem;
  border-radius: 4px;
  font-size: 0.72rem;
  cursor: pointer;
}
.block-edit__ac-item.is-active {
  background: var(--ls-accent, #1d4ed8);
  color: #fff;
}
.block-edit__ac-name {
  font-family: var(--ls-mono, monospace);
  font-weight: 700;
}
.block-edit__ac-values {
  font-family: var(--ls-mono, monospace);
  opacity: 0.75;
}
.block-edit__ac-default,
.block-edit__ac-doc {
  opacity: 0.7;
}
.block-edit__ac-doc {
  flex: 1 1 100%;
}
</style>
