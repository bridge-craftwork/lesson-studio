# Contract 1: Lesson DSL Grammar

**Status:** Draft for review
**Owner:** lesson-studio (grammar and parser versioned together here).
**Renderers:** `@bridge-craftwork/bridge-components` (Contract 2).
**Spec version:** `1`
**Date:** 2026-07-11

---

## Overview

A lesson is a single CommonMark (GitHub-flavored) markdown document with two
kinds of structured content layered on top of ordinary prose:

1. **YAML front matter** — a leading `---` fenced block carrying lesson
   metadata (Contract 4 owns the taxonomy field semantics; the schema is
   restated here).
2. **Reserved fenced blocks** — fenced code blocks whose info string is one of
   the reserved language tags below. Each is rendered as a live Vue node view
   in the editor and as a static component in the print view, using the same
   Contract 2 components in both.

```
hand   hands   auction   response-box   deal   quiz   pagebreak   row
```

Everything else is plain CommonMark and renders normally.

### Why fenced blocks

Fenced code blocks are the one CommonMark construct remark preserves
**verbatim** — info string and body pass through serialization byte-for-byte.
That is what makes the round-trip requirement below achievable in Milkdown
(ProseMirror + remark) without a custom AST extension per block. The block body
is a small, line-oriented text format the node view parses on load and
re-serializes on save.

### Round-trip requirement (normative)

> Every block MUST round-trip losslessly through Milkdown's markdown
> serialization.

Concretely: loading a lesson and saving it with no edits MUST produce a
byte-identical file. To make this deterministic, each block defines a
**canonical form**. Node views parse permissive input but always serialize the
canonical form; CI lint (Publishing Workflow step 3) rejects any block whose
source is not already canonical, so committed lessons are stable and diffs are
minimal. `lesson-studio` ships a `--fix` formatter that rewrites a lesson to
canonical form.

## Shared notation

One vocabulary, referenced by every block, and shared with Contracts 2 and 3.

| Concept | Notation | Notes |
|---|---|---|
| **Suits** (order) | `S H D C` → ♠ ♥ ♦ ♣ | Always spades-high, top-to-bottom in diagrams. |
| **Ranks** | `A K Q J T 9 8 7 6 5 4 3 2` | Ten is `T`. Within a holding, ranks descend. |
| **Void** | `-` in source | Rendered as `—`. |
| **Seats** | `N E S W` | |
| **Calls** | `1C`…`7NT`, `P`, `X`, `XX` | Strain in `C D H S NT`; renderer maps to glyphs. Identical to Contract 3 Call notation. |

### Canonical Hand object

The structured form a hand holding maps to. **This is the single source of
truth shared by Contract 1 (`hand`/`hands` blocks), Contract 2 (component
props), and Contract 3 (quiz `bidding` items).** All three MUST use it.

```json
{ "spades": "AQ", "hearts": "A5", "diamonds": "8743", "clubs": "QJT95" }
```

Ranks descend; ten is `T`; a void suit is `""`. A legal *hand* has 13 cards
across the four suits; a *fragment* (teaching hand with fewer cards) is allowed
in `hand`/`hands` blocks and flagged only as a warning, not an error.

## Front matter

A single YAML block at the top of the file. The **authoritative schema lives in
Contract 4** ([taxonomy-and-front-matter.md](taxonomy-and-front-matter.md));
restated here for convenience:

| Field | Req | Type | Notes |
|---|---|---|---|
| `title` | ✓ | string | Lesson title. |
| `skill_paths` | ✓ | string[] | Taxonomy paths (Contract 4); every entry lint-validated against the taxonomy JSON. |
| `primary` | – | string | Best-single-doc path for remediation lookup; must be one of `skill_paths`. |
| `level` | ✓ | enum | `basic` \| `intermediate` \| `advanced` \| `expert` (aligned to the taxonomy `level` vocabulary). |
| `author` | ✓ | string | |
| `status` | ✓ | enum | `draft` \| `published`. |
| `reviewed-by` | ✓ | string | Reviewer, or `self` for maintainer direct-push. |

```yaml
---
title: New Minor Forcing
skill_paths:
  - bidding_conventions/new_minor_forcing
primary: bidding_conventions/new_minor_forcing
level: intermediate
author: Rick Wilson
status: published
reviewed-by: self
---
```

## Blocks

### `hand` — single-hand fragment

One holding per suit line, spades-high. Optional keys precede the holding
lines. Void as `-`.

````markdown
```hand
seat: S
S: A Q 5 4
H: K J 3
D: A 7 2
C: Q 8 5
```
````

| Key | Req | Notes |
|---|---|---|
| `seat` | – | `N E S W`; drives the seat label. Omit for an unlabeled fragment. |
| `label` | – | Free-text caption (e.g. `Opener`). |
| `marks` | – | Per-card badges: space-separated `<suit><rank>=<badge>` (e.g. `marks: S9=1 S8=2` badges the 9 and 8 of spades). Ten is `T` or `10`. Renders as the component's card badges — used to mark length points on the 5th/6th cards of a suit. |

**Canonical form:** keys first (order `seat`, `label`), then the four suit lines
in `S H D C` order (one space between ranks, `-` for a void, every suit line
present), then an optional `marks` line with cards in `S H D C` / high-to-low
order.

### `hands` — two- or four-hand fragment (compass layout)

Multiple seats, each a full holding, laid out on a compass. West is leftmost;
South is bottom.

````markdown
```hands
layout: NS
N: S:K T 6  H:J T 9 2  D:Q J  C:K 7 6 3
S: S:A Q    H:A 5      D:8 7 4 3  C:Q J T 9 5
```
````

| Key | Req | Notes |
|---|---|---|
| `layout` | – | Which seats to show: `NS`, `EW`, or `all`. Default inferred from the seat lines present. |
| `<seat>` | ✓ (≥2) | `N`/`E`/`S`/`W` → the seat's holding, given as `S:… H:… D:… C:…` on one line. |

**Canonical form:** `layout` first, then seat lines in `N E S W` order for the
seats present; within a seat line, suits in `S H D C` order, `-` for a void,
single spaces between ranks, two spaces between suit groups.

### `auction` — bidding table

A **flat, dealer-first** list of calls. The renderer (`AuctionTable`, Contract 2)
lays them into the W-N-E-S grid from `dealer` — the source does not carry a
grid, matching the component's `bids` prop and Contract 3's `{dealer, calls}`
auction shape. Calls read left-to-right, top-to-bottom, starting with the
dealer; line breaks are for readability only (conventionally one round of four
per line). Annotations follow the **PBN convention**: a `=1=`, `=2=`, … marker
after the call it annotates, with numbered notes after a `---` separator. A
trailing `AP` stands for All Pass.

````markdown
```auction
dealer: N
1C   P    1D   P
1H   P    2C =1=  P
2H   AP
---
1. Fourth-suit forcing, game-forcing
```
````

| Key | Req | Notes |
|---|---|---|
| `dealer` | ✓ | `N E S W`. The dealer makes the first call; the renderer offsets it into the dealer's column. |

Rules: calls are whitespace-separated in bidding order (dealer first, clockwise);
newlines are insignificant. Calls use the shared Call notation; the renderer
maps strains to glyphs and applies dealer alignment. `AP` may replace a closing
run of passes. Notes are `N. text`, numbered from 1, matching the `=N=` markers;
the renderer shows each marker as a superscript on its call.

**Annotation notation.** `=N=` matches the PBN standard (a note reference in a
PBN auction section), so lesson auctions read the same way as the PBN files
lessons are often derived from. The marker may be written detached (`2C =1=`,
preferred) or attached (`2C=1=`). The earlier `^N` form is still parsed for
back-compatibility but is no longer canonical.

**Canonical form:** `dealer` line; then calls one round (up to four) per line,
single-space-separated, `=N=` markers detached after their call; optional `---` then numbered notes in
order. (Superseded the earlier W-N-E-S source grid; see Contract 2 — the
component owns grid layout, so the source stays a flat call list.)

### `response-box` — convention response table

A titled two-column `bid | meaning` table (e.g. Responding to Blackwood).

````markdown
```response-box
title: Responding to 1430 RKCB
4NT | Roman Key Card Blackwood
5C  | 1 or 4 keycards
5D  | 0 or 3 keycards
5H  | 2 keycards, without the trump queen
5S  | 2 keycards, with the trump queen
---
Count the trump king as a fifth keycard.
```
````

| Key | Req | Notes |
|---|---|---|
| `title` | ✓ | Box heading. |

Rows are `left | right`; the left column is typically a call (rendered with
glyphs when it parses as one) but free text is allowed (e.g. `5NT` ranges,
`After 5C`). An optional `---` separator introduces a footer note paragraph.

**Canonical form:** `title` line; rows with a single ` | ` separator, left
column left-aligned; optional `---` then the footer note.

### `deal` — repository board reference (Phase 2; stubbed in v1)

References a bba-filtered board by stable identity (per ADR-0001 and the
bilateral deal-repository contract) rather than inlining cards, so editing the
deal in PBS updates every referencing lesson.

````markdown
```deal
repo: Practice-Bidding-Scenarios
id: 000B6835D55DDDE2A07889A2F0DF
show: [N, S]
rotate-south: true
```
````

| Key | Req | Notes |
|---|---|---|
| `repo` | ✓ | Source repository. |
| `id` | ✓ | Stable board identity (same hash as Contract 3 `board.id`). |
| `show` | – | Seats to display; default all four. |
| `rotate-south` | – | Boolean; put the study seat on the bottom. |

**v1 status:** the `deal` tag is **reserved but not resolved**. Phase-1 lessons
use inline `hand`/`hands` fragments only; Phase-1 lint accepts a well-formed
`deal` block structurally but does not resolve the reference. Reference
resolution lands in Phase 2 (architecture doc Roadmap).

### `quiz` — embedded quiz snapshot (Contract 3, by value)

The block body is a Contract 3 quiz object (`quiz/v1`), embedded **by value** —
snapshotted so lessons are immune to PBS pipeline churn, with embedded
provenance keeping staleness detectable.

````markdown
```quiz
{
  "schema": "quiz/v1",
  "type": "bidding",
  "id": "1C_WalshStyle",
  "title": "Exercise One — Responding to 1♣",
  "prompt": "Partner opens 1♣. What do you bid with each of these hands?",
  "provenance": { "source": "Practice-Bidding-Scenarios",
    "pipeline_version": "0.0.0", "generated": "2026-07-11",
    "source_quiz": "1C_WalshStyle" },
  "items": [ { "hand": { "spades": "AQ", "hearts": "A5",
    "diamonds": "8743", "clubs": "QJT95" }, "answer": "1D" } ]
}
```
````

**Canonical form:** the JSON pretty-printed with 2-space indentation, keys in
schema order. Lint validates the body against the Contract 3 JSON Schema. The
`quiz-picker` plugin (Phase 2) writes these; in Phase 1 they may be authored by
hand.

**Question/answer separation is a render concern, not source layout.** The
embedded quiz object carries *both* the question and its answer/explanation; a
`quiz` block renders only the **question** inline. The renderer (Contract 2)
collects every quiz's answer in document order into a generated "Answers"
section deferred behind a page break — so authors cannot leak answers by
mis-placing a break, and the answer section stays synchronized as quizzes are
reordered or deleted. The same source yields render variants (student /
teacher-inline / projection-omitted / interactive tap-to-reveal). The DSL
source therefore contains no answer-placement markup.

### `row` — horizontal layout group

Lays a short lead-in and one or more blocks **side by side** as a full-width
band (in the print view it spans all columns). The one composition primitive in
an otherwise single-column-flow format — for a figure like "narrative + a table
+ an example hand" that reads as a unit.

Because it contains other fenced blocks, the `row` fence uses **four** backticks
so the inner three-backtick blocks are part of its body:

`````markdown
````row
Count your points on pickup: high-card points plus length points.

```response-box
title: High-card points
A | 4
K | 3
Q | 2
J | 1
```

```hand
S: A K Q J 9 8
H: K 5 2
D: Q 4 3
C: 3
marks: S9=1 S8=2
```
````
`````

The body is parsed into ordered items: prose paragraphs (plain text — no inline
markdown) and nested reserved blocks (`row` cannot nest inside `row`). Items
render in a flex row; block figures render a touch larger.

**Canonical form:** the four-backtick fence; body items in source order.

### `pagebreak` — explicit page break

A layout hint for general page control, distinct from the automatic
answer-deferral break above.

````markdown
```pagebreak
```
````

The body is empty. Maps to `break-before: page` in the print view; the editor
renders a labeled divider. Ignored where pagination is not meaningful (e.g. the
interactive platform variant).

**Canonical form:** the bare fenced block with an empty body.

## Validation (CI lint)

The lint referenced in the architecture doc's Publishing Workflow, for the
parts this contract owns:

1. Front matter present and schema-complete; `primary` ∈ `skill_paths`.
2. Every reserved block parses; unknown reserved-looking tags are an error.
3. `hand`/`hands`: holdings use only legal ranks; no duplicate cards within a
   hand; a full hand has 13 cards (fragments warn, don't fail).
4. `auction`: `dealer` present; every call is legal Call notation (or `AP`);
   every `=N=` marker has a matching note and vice-versa.
5. `response-box`: `title` present; every row has exactly one ` | `.
6. `deal`: structurally well-formed (v1 does **not** resolve the reference).
7. `quiz`: body validates against Contract 3 `quiz/v1`.
8. `pagebreak`: body is empty.
9. Every block is already in canonical form (else `--fix` it).

## Versioning and evolution

- The spec is versioned as this document (`Spec version`). Lessons do **not**
  embed a DSL version; they are validated against the current spec, and the
  `--fix` formatter migrates canonical-form changes mechanically.
- **Additive** changes (new optional block key, new reserved tag) are minor and
  reviewed here. Removing a tag/key, changing notation semantics, or changing a
  canonical form is a breaking change requiring an ADR-style review and a
  formatter migration.
- The shared Hand object and Call notation are **frozen** across Contracts 1–3;
  changing either is a cross-contract change.

## v1 scope (Phase 1)

Active in Phase 1: `hand` (with `marks`), `hands`, `auction`, `response-box`,
`pagebreak`, `row`, front matter. `quiz` is defined and hand-authorable but the
picker that
populates it is Phase 2. `deal` is reserved and structurally linted but not
resolved until Phase 2. This is exactly the vocabulary the two seed lessons
(Lessons 1–6 summary, New Minor Forcing intro) need.

## Open items for review

1. **Hand object alignment.** This freezes `{spades, hearts, diamonds, clubs}`
   as the shared wire shape (closing Contract 3 open item #1). Contract 2
   confirms the component keeps an array form and lesson-studio adapts via a
   one-line spread — no PBN holding string, no wire change.
2. **Auction source form — resolved to flat.** Reconciled from the earlier
   W-N-E-S grid to a flat dealer-first call list, matching the `AuctionTable`
   component (Contract 2) and Contract 3. Revisit readability after the New
   Minor Forcing intro exposes real multi-round auctions.
3. **Suit glyphs in source.** Source uses ASCII strain letters (`1C`), render
   maps to glyphs; but `title`/prose/`response-box` free text may contain
   literal `♣`. Confirm lint/formatter leave author-entered glyphs untouched.
4. **Deal display options.** `show`/`rotate-south` are a first guess; finalize
   against the Contract 2 deal component when `deal` is wired in Phase 2.
