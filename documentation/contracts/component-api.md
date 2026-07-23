# Contract 2: Component Package API

**Status:** Draft for review
**Owner:** Bridge-Classroom (`@bridge-craftwork/bridge-components`).
**Consumers:** Bridge-Classroom app, lesson-studio editor node views,
lesson-studio print view, future embeddable widgets.
**Package version:** semver (`0.1.0` at extraction).
**Date:** 2026-07-11

---

## Purpose

Defines the public component surface of `@bridge-craftwork/bridge-components`:
the Vue components that render the DSL blocks (Contract 1) and quiz snapshots
(Contract 3), the props each accepts, and the two small adapters that map the
DSL/quiz **wire forms** to component props. One library renders every block
identically in the editor node views, the print view, and the Bridge-Classroom
app.

## Package boundary (normative)

Extracted **in place** to `packages/bridge-components/` inside Bridge-Classroom,
per the architecture doc's consumption model:

- Own `package.json`; `vue` a **peer** dependency; `resolve.dedupe: ['vue']` at
  every consumer to avoid duplicate-Vue reactivity bugs.
- **No imports** from app stores (Pinia), router, API/network layers, or
  `import.meta.env`. Components are pure: props in, rendered DOM + events out.
  The existing `HandDisplay`/`AuctionTable` already satisfy this (the seat
  *identity* concerns — presence, turn state — live in `SeatPanel`/`SeatChip`,
  not in the holding renderer).
- The Bridge-Classroom app consumes its own components through this same
  boundary. Dev builds Vite-alias the package to the sibling checkout for
  cross-repo HMR; CI/release install the pinned published version.

## Shared types

The wire vocabulary is owned by Contract 1 and reused verbatim here.

- **Call** — `"1C"…"7NT" | "P" | "X" | "XX"` (strain in `C D H S NT`).
- **Seat** — `"N" | "E" | "S" | "W"`.
- **Hand (wire form)** — `{ spades, hearts, diamonds, clubs }`, each a rank
  **string**, ranks descending, ten as `T`, void `""`. Frozen across
  Contracts 1/3/4.

### Hand adapter (wire → component)

The `HandDisplay` component's `hand` prop keys are the **same full-word suit
names**, but each value is an **array of rank characters**, not a string:

```
component hand = { spades: ["A","Q"], hearts: ["A","5"],
                   diamonds: ["8","7","4","3"], clubs: ["Q","J","T","9","5"] }
```

Because every rank is exactly one character (`T` = ten), the adapter is a
lossless spread — no parsing:

```js
const toComponentHand = (h) => ({
  spades: [...h.spades], hearts: [...h.hearts],
  diamonds: [...h.diamonds], clubs: [...h.clubs],
})
```

This adapter lives in lesson-studio's node views and print view. It is the
reason the wire form can stay a compact, diff-friendly string while the
component keeps its array-based rendering.

### Auction adapter (wire → component)

`AuctionTable` takes a **flat, dealer-first `bids` array** plus `dealer`; it
computes the W-N-E-S grid internally from the dealer. This matches the auction
shape in Contract 3 (`{ dealer, calls }`) and Contract 1's (reconciled) flat
`auction` block. The adapter flattens the source calls and lifts annotations
into the `meanings` array:

```js
// DSL auction { dealer, calls: [...], notes: {1: "..."} }  ->  AuctionTable props
const toAuctionProps = (a) => ({
  dealer: a.dealer,
  bids: a.calls.map(stripAnnotationMarker),        // "2C^1" -> "2C"
  meanings: annotationsToMeanings(a.calls, a.notes) // [{position, bid, meaning}]
})
```

## Components

### `HandDisplay` (exists — extract as-is)

Pure holding renderer.

| Prop | Type | Notes |
|---|---|---|
| `hand` | Hand (component/array form) | The holding. |
| `showHcp` | boolean | Show HCP count. |
| `showTotalPoints` | boolean | Show `X+Y TP` when length points > 0. |
| `compact` | boolean | Tighter layout. |
| `density` | `'chip'\|'compact'\|'full'` | Rendering budget (`full` today). |
| `marks` | object | Per-card annotation map keyed by card code (`"SK"`, `"DT"`). |
| `clickable` | boolean | Editor interaction only. |

Emits `card-click: { suit: Seat-less suit letter, rank }`. In lessons it renders
read-only (`clickable` off, `marks` unset).

### `HandsCompass` (new — build for package)

The `hands` block's two/four-hand compass. Composes `HandDisplay` per seat with
a compass layout (West left, South bottom). The app's `BridgeTable`/`SeatPanel`
are the design reference but are interaction-coupled; the package ships a lean,
static compass instead.

| Prop | Type | Notes |
|---|---|---|
| `hands` | `{ [seat: Seat]: Hand }` | 2 or 4 seats. |
| `layout` | `'NS'\|'EW'\|'all'` | Which seats shown; default inferred from keys. |
| `labels` | `{ [seat: Seat]: string }` | Optional seat captions. |

Read-only; no events.

### `AuctionTable` (exists — extract as-is)

| Prop | Type | Notes |
|---|---|---|
| `bids` | `Call[]` | Flat, dealer-first. Internally laid into W-N-E-S rounds by `dealer`. |
| `dealer` | Seat | |
| `meanings` | `[{ position, bid, meaning, isAlert, note }]` | `position` = index into `bids`; drives per-cell annotation/hover. `note` = footnote number (superscript); `isAlert` = render the `!` marker. |
| `columns` | `2 \| 4` | Default `4`. `2` selects the two-column print form; silently falls back to `4` when the auction is competitive (see below). |
| `labels` | `[string, string]` | Header labels for the two-column form, left then right. Default: the compass letters of the two seats shown. Ignored at `columns: 4`. |
| `grid` | boolean | Default `true`. `false` drops the gridlines and dark header bar for an unruled table. |

The review-mode props (`currentBidIndex`, `wrongBidIndex`, `divergedBids`,
`allowDivergenceToggle`, …) are out of the lesson-rendering contract — lessons
pass only `bids`, `dealer`, `meanings`, and the three display props. All-Pass
renders from trailing `P` calls; a lesson may also pass an explicit terminal
marker (see Contract 1).

**Two-column layout (normative).** The component owns this, as it owns the
four-column grid — the source stays a flat call list either way. Given `bids`
and `dealer` it derives the seat of each call, finds the **active pair** (the
partnership making every non-pass call), and renders that pair's calls only:
left column = the seat that made the first non-pass call, right = its partner.
The other pair's calls (all passes, by that precondition) are dropped, as is a
trailing run of passes or `AP`. The active pair's *own* passes are kept, so a
passed hand renders as an empty left cell beside a `Pass`. If both pairs make a
non-pass call, or no call is non-pass, there is no active pair and the component
renders the normal four-column grid. Because the fallback is silent, `columns:
2` is always safe for a consumer to pass.

The two-column form **shrink-wraps to its content and centres**, rather than
filling its container as the four-column grid does: stretched across a print
column, two columns of bids land too far apart to read as one auction.

Review-mode decorations (turn indicator, wrong/correct highlighting, diverged
stacked bids) are **not** rendered in the two-column form — it is a
lesson/print layout, and those are student-app affordances.

### `ResponseBox` (new — build for package)

The `response-box` convention table.

| Prop | Type | Notes |
|---|---|---|
| `title` | string | Box heading. |
| `rows` | `[{ left, right }]` | `left` rendered with suit glyphs when it parses as a Call, else free text. |
| `note` | string | Optional footer. |

Read-only.

### `QuizSnapshot` (new — build for package)

Renders a Contract 3 `quiz/v1` object embedded by value. Dispatches on `type`;
v1 renders the `bidding` type (prompt + per-item hand via `HandDisplay`,
optional `context` auction via `AuctionTable`, answer + explanation).

| Prop | Type | Notes |
|---|---|---|
| `quiz` | `quiz/v1` object | The embedded snapshot (Contract 3). |
| `variant` | `'student' \| 'teacher' \| 'projection' \| 'interactive'` | Render variant; default `'student'`. Drives answer placement (below). |

**Answer deferral (the quiz/answer separation).** A `QuizSnapshot` renders the
**question** only; it never prints its own answer inline (except `variant:
'teacher'`). Instead it contributes its answer to a document-level **answer
registry** that the page shell drains into a single generated "Answers" section
after a page break. This makes the separation structural rather than a CSS
accident — answers cannot leak onto the question page regardless of authoring.
Variant behavior:

- `student` — question inline; answer deferred to the trailing Answers section.
- `teacher` — question and answer inline.
- `projection` — question inline; answer omitted entirely.
- `interactive` — question inline; answer revealed on tap (platform mode; no
  pagination).

The registry/collector is a small provider the print view and editor mount; the
component publishes `{ id, answer, explanation }` to it. The interactive
practice flow itself stays in the app.

### `DealView` (Phase 2 — new)

Renders a resolved `deal` block. Deferred with `deal` resolution to Phase 2
(Contract 1 keeps `deal` reserved-but-stubbed in v1). Props finalized then;
expected shape: `{ deal: <resolved board>, show: Seat[], rotateSouth: boolean }`.

## Print stylesheet tokens

The package exports the print stylesheet (CSS custom properties) the print view
consumes so editor and print render identically:

- Suit glyph colors (`--suit-spades`, `--suit-hearts`, `--suit-diamonds`,
  `--suit-clubs`), card/table sizing units, and the box/border tokens.
- **`break-inside: avoid`** is applied by every block component's root, so a
  `HandsCompass`, `AuctionTable`, `ResponseBox`, or `QuizSnapshot` never splits
  across a print column/page break (architecture doc Open Question 4).
- **Section-level breaks, not multicol breaks.** The print view is a sequence
  of independently multi-column sections (questions, then the deferred Answers
  section) with break rules *between* sections — page breaks between sequential
  sections are reliable under Playwright, whereas breaks inside a single
  multicol flow are not. The `pagebreak` block maps to `break-before: page`;
  the answer-deferral break is inserted by the shell before the Answers section.

## lesson-studio as a first-class consumer

The components were built for the student and teacher apps, but **lesson-studio
is a first-class client of the library, not a guest** (decision, 2026-07-22).
Print/lesson needs may therefore be met by *adding to the component API* rather
than by lesson-studio reaching into component internals.

This matters for snapshot durability: any styling lesson-studio applies by
targeting a component's internal class names or CSS variables breaks silently
the next time the components are re-snapshotted. Coupling belongs at the props
boundary, which is exactly what this contract is for.

**Current leaks to retire** (lesson-studio reaches into internals today):

| Leak | Where | Should become |
|---|---|---|
| `break-inside: avoid` applied by targeting `.holding` / `.auction-table` | lesson-studio `src/print/print.css` | A **`no-break`** prop (or always-on print behavior) on every block component's root |
| `--table-scale: 1.2` set on row figures | lesson-studio `src/render/BlockView.vue` | A documented **size/scale prop** (e.g. `scale` or `density`) rather than an internal CSS variable |

Both are already implied by the Print stylesheet tokens section above — the
components own their print behavior; consumers pass props.

**Rule for structured (per-block) editing.** When lesson-studio adds in-place
editing for a block type, it edits the **DSL model** and re-renders through the
component's props. It must never make the component's rendered DOM editable or
reach into its markup — that would couple editing to render internals and break
on every snapshot. Components stay pure, read-only renderers behind their props.

## Build status (extraction plan)

| Component | DSL block | Status |
|---|---|---|
| `HandDisplay` | `hand`, `hands` (per seat) | Exists; extract as-is. |
| `AuctionTable` | `auction`, quiz `context` | Exists; extract as-is. |
| `HandsCompass` | `hands` | New (compose `HandDisplay`). |
| `ResponseBox` | `response-box` | New. |
| `QuizSnapshot` | `quiz` | New (renders Contract 3). |
| `DealView` | `deal` | Phase 2. |

Phase 1 proves these copied-in inside lesson-studio; extraction to the package
happens against the now-proven consumer (architecture doc Roadmap).

## Versioning

- Semver over the public component surface. Adding a component or an optional
  prop is MINOR; removing/renaming a prop or changing render semantics is MAJOR
  and reviewed here.
- The shared Hand/Call types are frozen across Contracts 1–3; changing either
  is a cross-contract change.
- `taxonomy.json` (Contract 4) ships versioned with this package so a pinned
  component version pins a matching taxonomy.

## Open items for review

1. **Hand array vs. string — confirmed adapter, not a wire change.** The
   component keeps its array form; lesson-studio adapts via the one-line spread.
   Contract 3 open item #1 and Contract 1 open item #1 are resolved this way
   (no change to the frozen wire Hand object).
2. **Auction reconciled to flat.** Contract 1's `auction` block is updated from
   a W-N-E-S source grid to a flat dealer-first call list, matching this
   component and Contract 3. Confirm the flat source reads acceptably for the
   New Minor Forcing multi-round auction.
3. **New components' fidelity.** `HandsCompass`, `ResponseBox`, `QuizSnapshot`
   are new. Confirm `HandsCompass` may reuse `HandDisplay` without dragging in
   `SeatPanel`'s interaction coupling.
4. **Package export surface.** Confirm the print stylesheet tokens ship from the
   package (vs. a separate `@bridge-craftwork/bridge-print` sub-path export).
5. **Additive props for lesson-studio** (see "first-class consumer" above).
   Agree the names and shapes with Bridge-Classroom before the next snapshot:
   - `no-break` — root gets `break-inside: avoid`. Needed by every block
     component for column/page-safe print.
   - a **size/scale** prop to replace lesson-studio setting `--table-scale`
     directly; row figures currently render at 1.2×.
   - `meanings[].note` — footnote superscript on an annotated bid, so printed
     lessons can key numbered notes to calls (hover tooltips don't print).
   - `meanings[].isAlert` rendered as a `!` marker on the bid. The prop shape
     already documents `isAlert`; nothing renders it today.
   - a **typeface hook** on `HandDisplay`: it hardcodes `'Segoe UI', system-ui`
     for card ranks, which overrides whatever the host document uses and, in
     print, embeds a second font family for those glyphs alone. A prop (or
     simply inheriting) would let the consumer own its typography.
   - a **legibility floor** on small labels that scale with `--table-scale`.
     `HandDisplay`'s `.hcp` starts at 12px and lands near 7px at the 0.62 scale
     a printed lesson uses; the cards survive because they start at 24px. Small
     text needs `max(<floor>, calc(<base> * var(--table-scale)))`.
   - **`columns` / `labels` / `grid`** on `AuctionTable` (specified above) — the
     two-column uncontested form, explicit header labels, and an unruled
     variant. Print/teaching material overwhelmingly uses these; the student app
     keeps the four-column ruled grid by default.
   All are additive (MINOR), so they can land without disturbing the student
   and teacher apps.
