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
import CallLabel from '../bridge/CallLabel.vue'
import SuitText from '../bridge/SuitText.vue'
import {
  parseHandBlock,
  parseHandsBlock,
  parseAuctionBlock,
  toAuctionProps,
  parseResponseBox,
  parseRowBlock,
  toComponentHand,
  type ReservedBlock,
  type RowItem,
} from '@/dsl'
// Self-import so a `row` block can recursively render its child blocks.
import BlockView from './BlockView.vue'

const props = defineProps<{ tag: ReservedBlock; body: string }>()

type CardMarks = { cards: Record<string, { badge: string }> }
type Rendered =
  | { kind: 'hand'; hand: ReturnType<typeof toComponentHand>; label?: string; marks?: CardMarks }
  | { kind: 'hands'; hands: Record<string, ReturnType<typeof toComponentHand>>; layout?: string }
  | { kind: 'auction'; auction: ReturnType<typeof toAuctionProps> }
  | { kind: 'response-box'; box: ReturnType<typeof parseResponseBox> }
  | { kind: 'quiz'; quiz: unknown }
  | { kind: 'row'; items: RowItem[] }
  | { kind: 'pagebreak' }
  | { kind: 'error'; message: string }

const model = computed<Rendered>(() => {
  try {
    switch (props.tag) {
      case 'hand': {
        const b = parseHandBlock(props.body)
        let marks: CardMarks | undefined
        if (b.marks) {
          const cards: Record<string, { badge: string }> = {}
          for (const [card, badge] of Object.entries(b.marks)) cards[card] = { badge }
          marks = { cards }
        }
        return { kind: 'hand', hand: toComponentHand(b.hand), label: b.label ?? b.seat, marks }
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
      case 'row':
        return { kind: 'row', items: parseRowBlock(props.body) }
      case 'pagebreak':
        return { kind: 'pagebreak' }
      default:
        return { kind: 'error', message: `unsupported block: ${props.tag}` }
    }
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : String(err) }
  }
})

// Only annotated calls earn a footnote line; a bare `!` alert marks the cell
// but has no text to list.
const auctionNotes = computed(() =>
  model.value.kind === 'auction'
    ? model.value.auction.meanings.filter(
        (m): m is typeof m & { note: number; meaning: string } =>
          m.note != null && m.meaning != null
      )
    : []
)
</script>

<template>
  <!-- The tag/body are exposed on the shared render path, not just on the
       editor's node view, so blocks nested inside a `row` are visible to the
       print pass that maps click targets (scripts/block-map.mjs). -->
  <div
    class="block-view"
    :class="`block-view--${model.kind}`"
    :data-block-tag="tag"
    :data-block-body="body"
  >
    <template v-if="model.kind === 'hand'">
      <HandDisplay :hand="model.hand" :show-hcp="true" :marks="model.marks" />
    </template>
    <template v-else-if="model.kind === 'hands'">
      <HandsCompass :hands="model.hands" :layout="model.layout as any" />
    </template>
    <template v-else-if="model.kind === 'auction'">
      <div class="auction">
        <AuctionTable
          :bids="model.auction.bids"
          :dealer="model.auction.dealer"
          :meanings="model.auction.meanings"
          :columns="model.auction.columns"
          :labels="model.auction.labels"
          :grid="model.auction.grid"
        />
        <!-- The real AuctionTable surfaces meanings only on hover; lessons and
             print need the numbered footnotes visible, so render them here.
             A bare `!` alert has no note text and contributes no list entry. -->
        <ol v-if="auctionNotes.length" class="auction__notes">
          <li v-for="m in auctionNotes" :key="m.note">
            <span class="auction__note-num">{{ m.note }}.</span>
            <CallLabel :value="m.bid" />: <SuitText :text="m.meaning" />
          </li>
        </ol>
      </div>
    </template>
    <template v-else-if="model.kind === 'response-box'">
      <ResponseBox :title="model.box.title" :rows="model.box.rows" :note="model.box.note" />
    </template>
    <template v-else-if="model.kind === 'quiz'">
      <QuizSnapshot :quiz="model.quiz as any" variant="student" />
    </template>
    <template v-else-if="model.kind === 'row'">
      <div class="block-row">
        <template v-for="(item, i) in model.items" :key="i">
          <div v-if="item.kind === 'prose'" class="block-row__prose"><SuitText :text="item.text" /></div>
          <BlockView v-else class="block-row__item" :tag="item.tag" :body="item.body" />
        </template>
      </div>
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
.block-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.25rem;
}
.block-row__prose {
  flex: 1 1 12rem;
  min-width: 10rem;
}
.block-row__item {
  flex: 0 0 auto;
  /* Row figures read as the section's focus — a step up from the document
     baseline (:root --table-scale) so hand badges have room. */
  --table-scale: calc(0.78 * var(--lesson-scale, 1));
}
/* An auction spans the full column rather than shrink-wrapping. Otherwise the
   figure's width is set by whichever is wider — the table or the FOOTNOTES —
   so an auction with a long note renders wider than one with short notes. A
   definite width also keeps the table above the component's "dense" threshold
   (< 280 × scale), which would otherwise shrink the bids. */
.block-view--auction {
  display: block;
}
/* Figures centre in their column. The auction already did (it fills the
   width); the hand shrink-wrapped and sat left, which read as inconsistent. */
.block-view--hand {
  display: flex;
  justify-content: center;
}
.auction {
  display: block;
  /* Auction bids are natively 18px against the hand's 24px cards, so they need
     a higher scale than the document baseline to read at the same size. 0.9
     puts a bid at 16.2px against 16px body text at the 12pt default — a bid
     should never read smaller than the prose around it. */
  --table-scale: calc(0.9 * var(--lesson-scale, 1));
}
.auction__notes {
  list-style: none;
  margin: 0.4rem 0 0;
  padding-left: 0;
  font-size: 0.75em;
  color: var(--ls-muted, #666);
}
.auction__note-num {
  font-variant-numeric: tabular-nums;
  margin-right: 0.15rem;
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
