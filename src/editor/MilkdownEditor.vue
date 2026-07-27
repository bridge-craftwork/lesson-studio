<script setup lang="ts">
import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewOptionsCtx,
  editorViewCtx,
} from '@milkdown/core'
import {
  commonmark,
  toggleStrongCommand,
  toggleEmphasisCommand,
  toggleLinkCommand,
  wrapInHeadingCommand,
  turnIntoTextCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
} from '@milkdown/preset-commonmark'
import { callCommand } from '@milkdown/utils'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { history, undoCommand, redoCommand } from '@milkdown/plugin-history'
import { clipboard } from '@milkdown/plugin-clipboard'
import { Milkdown, useEditor, useInstance } from '@milkdown/vue'
import { useNodeViewFactory } from '@prosemirror-adapter/vue'
import type { ReservedBlock } from '@/dsl'
import { bridgeBlocks } from '../blocks'
import { suitColoring } from '../blocks/suitColoring'

const props = withDefaults(
  defineProps<{ initialMarkdown?: string; editable?: boolean }>(),
  { editable: true },
)

// Emits the serialized body markdown whenever the document changes, so the
// parent can reconstruct + persist the full lesson.
const emit = defineEmits<{ 'update:body': [string] }>()

const nodeViewFactory = useNodeViewFactory()
const [, getEditor] = useInstance()

/**
 * Insert a reserved bridge block at the caret. Typed markdown fences don't
 * become blocks (only the load-time parser does that), so the ribbon inserts
 * the node programmatically — seeded with a starter body so it renders as a
 * valid, editable block immediately rather than an empty shell.
 */
function insertBlock(tag: ReservedBlock, body: string) {
  getEditor()?.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const type = view.state.schema.nodes[tag]
    if (!type) return
    view.dispatch(view.state.tr.replaceSelectionWith(type.create({ body })).scrollIntoView())
    view.focus()
  })
}

/**
 * Run a formatting command from the ribbon. These are commonmark's own commands
 * (they also fire from markdown-syntax input rules while typing); the ribbon
 * exposes them for discoverability. Refocuses so the caret stays in the editor.
 */
type EditorCommand =
  | 'bold'
  | 'italic'
  | 'link'
  | 'h2'
  | 'h3'
  | 'paragraph'
  | 'bullet'
  | 'ordered'
  | 'undo'
  | 'redo'

function command(name: EditorCommand) {
  const editor = getEditor()
  if (!editor) return
  const spec: Record<EditorCommand, [unknown, unknown?]> = {
    bold: [toggleStrongCommand.key],
    italic: [toggleEmphasisCommand.key],
    link: [toggleLinkCommand.key],
    h2: [wrapInHeadingCommand.key, 2],
    h3: [wrapInHeadingCommand.key, 3],
    paragraph: [turnIntoTextCommand.key],
    bullet: [wrapInBulletListCommand.key],
    ordered: [wrapInOrderedListCommand.key],
    undo: [undoCommand.key],
    redo: [redoCommand.key],
  }
  const [key, payload] = spec[name]
  editor.action(callCommand(key as never, payload))
  editor.action((ctx) => ctx.get(editorViewCtx).focus())
}

defineExpose({ insertBlock, command })

useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, props.initialMarkdown ?? '')
      ctx.update(editorViewOptionsCtx, (prev) => ({
        ...prev,
        editable: () => props.editable,
      }))
      ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
        emit('update:body', markdown)
      })
    })
    // Bridge blocks are registered BEFORE commonmark so their parseMarkdown
    // matchers take precedence over the generic code_block.
    .use(bridgeBlocks(nodeViewFactory))
    .use(commonmark)
    // History (undo/redo + keymap) and clipboard go AFTER commonmark: they don't
    // compete with the bridge-block parsers, unlike bridgeBlocks. Each bridge
    // block stores its body verbatim in one node attr, so undo/redo treats it as
    // a single atomic step.
    .use(history)
    .use(clipboard)
    .use(listener)
    .use(suitColoring),
)
</script>

<template>
  <Milkdown />
</template>
