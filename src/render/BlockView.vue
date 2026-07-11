<script setup lang="ts">
/**
 * Static (read-only) renderer for a reserved DSL block: given a block tag and
 * its raw body, parse it and render the matching Contract 2 component. This is
 * the render path the gallery uses now and the print view will reuse; the
 * editor's node views share the same parsers/adapters.
 */
import { computed } from 'vue'
import {
  HandDisplay,
  HandsCompass,
  AuctionTable,
  ResponseBox,
  QuizSnapshot,
} from '@bridge-craftwork/bridge-components'
import {
  parseHandBlock,
  parseHandsBlock,
  parseAuctionBlock,
  toAuctionProps,
  parseResponseBox,
  toComponentHand,
  type ReservedBlock,
} from '@/dsl'

const props = defineProps<{ tag: ReservedBlock; body: string }>()

type Rendered =
  | { kind: 'hand'; hand: ReturnType<typeof toComponentHand>; label?: string }
  | { kind: 'hands'; hands: Record<string, ReturnType<typeof toComponentHand>>; layout?: string }
  | { kind: 'auction'; auction: ReturnType<typeof toAuctionProps> }
  | { kind: 'response-box'; box: ReturnType<typeof parseResponseBox> }
  | { kind: 'quiz'; quiz: unknown }
  | { kind: 'pagebreak' }
  | { kind: 'error'; message: string }

const model = computed<Rendered>(() => {
  try {
    switch (props.tag) {
      case 'hand': {
        const b = parseHandBlock(props.body)
        return { kind: 'hand', hand: toComponentHand(b.hand), label: b.label ?? b.seat }
      }
      case 'hands': {
        const b = parseHandsBlock(props.body)
        const hands: Record<string, ReturnType<typeof toComponentHand>> = {}
        for (const [seat, hand] of Object.entries(b.hands)) hands[seat] = toComponentHand(hand!)
        return { kind: 'hands', hands, layout: b.layout }
      }
      case 'auction':
        return { kind: 'auction', auction: toAuctionProps(parseAuctionBlock(props.body)) }
      case 'response-box':
        return { kind: 'response-box', box: parseResponseBox(props.body) }
      case 'quiz':
        return { kind: 'quiz', quiz: JSON.parse(props.body) }
      case 'pagebreak':
        return { kind: 'pagebreak' }
      default:
        return { kind: 'error', message: `unsupported block: ${props.tag}` }
    }
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : String(err) }
  }
})
</script>

<template>
  <div class="block-view">
    <template v-if="model.kind === 'hand'">
      <HandDisplay :hand="model.hand" :show-hcp="true" />
    </template>
    <template v-else-if="model.kind === 'hands'">
      <HandsCompass :hands="model.hands" :layout="model.layout as any" />
    </template>
    <template v-else-if="model.kind === 'auction'">
      <AuctionTable :bids="model.auction.bids" :dealer="model.auction.dealer" :meanings="model.auction.meanings" />
    </template>
    <template v-else-if="model.kind === 'response-box'">
      <ResponseBox :title="model.box.title" :rows="model.box.rows" :note="model.box.note" />
    </template>
    <template v-else-if="model.kind === 'quiz'">
      <QuizSnapshot :quiz="model.quiz as any" variant="student" />
    </template>
    <template v-else-if="model.kind === 'pagebreak'">
      <div class="pagebreak" title="page break">⎯⎯ page break ⎯⎯</div>
    </template>
    <template v-else>
      <div class="block-error">{{ model.message }}</div>
    </template>
  </div>
</template>

<style scoped>
.block-view {
  display: inline-block;
}
.pagebreak {
  color: var(--ls-muted, #999);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-align: center;
  padding: 0.5rem 2rem;
  border-top: 1px dashed var(--ls-border, #ccc);
  border-bottom: 1px dashed var(--ls-border, #ccc);
}
.block-error {
  font-family: var(--ls-mono, monospace);
  font-size: 0.8rem;
  color: #c81e1e;
  padding: 0.5rem;
  border: 1px dashed #c81e1e;
  border-radius: 6px;
}
</style>
