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
hand   hands   auction   response-box   deal   quiz
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

A single YAML block at the top of the file. Fields (Contract 4 owns
`skill_paths`/`primary` semantics and the taxonomy validation):

| Field | Req | Type | Notes |
|---|---|---|---|
| `title` | ✓ | string | Lesson title. |
| `skill_paths` | ✓ | string[] | Taxonomy paths (Contract 4); every entry lint-validated against the taxonomy JSON. |
| `primary` | – | string | Best-single-doc path for remediation lookup; must be one of `skill_paths`. |
| `level` | ✓ | enum | `beginner` \| `intermediate` \| `advanced`. |
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

**Canonical form:** keys first (in the order `seat`, `label`), then the four
suit lines in `S H D C` order, one space between ranks, `-` for a void. Every
suit line is present even when void.

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

A grid of calls. **Columns are fixed W N E S (West leftmost).** Leading cells
before the dealer's first call are `-`. `AP` terminates an auction as All Pass.
Annotation markers are `^1`, `^2`, … appended to a call, with numbered notes
after a `---` separator.

````markdown
```auction
dealer: N
W    N    E    S
-    1C   P    1D
P    1H   P    2C^1
P    2H   AP
---
1. Fourth-suit forcing, game-forcing
```
````

| Key | Req | Notes |
|---|---|---|
| `dealer` | ✓ | `N E S W`. The dealer's column holds the first non-`-` call; earlier columns in the first row are `-`. |

Rules: the header row is literally `W    N    E    S`. Every row has four
whitespace-separated cells except the final row, which may be shortened by
`AP`. Calls use the shared Call notation; the renderer maps strains to glyphs
and applies dealer alignment. Notes are `N. text`, numbered from 1, matching
the `^N` markers.

**Canonical form:** `dealer` line; the fixed header row; call rows with columns
aligned to a 5-space grid; optional `---` then numbered notes in order.

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

## Validation (CI lint)

The lint referenced in the architecture doc's Publishing Workflow, for the
parts this contract owns:

1. Front matter present and schema-complete; `primary` ∈ `skill_paths`.
2. Every reserved block parses; unknown reserved-looking tags are an error.
3. `hand`/`hands`: holdings use only legal ranks; no duplicate cards within a
   hand; a full hand has 13 cards (fragments warn, don't fail).
4. `auction`: header row exact; four cells per row (modulo `AP`); every call is
   legal Call notation; every `^N` marker has a matching note and vice-versa.
5. `response-box`: `title` present; every row has exactly one ` | `.
6. `deal`: structurally well-formed (v1 does **not** resolve the reference).
7. `quiz`: body validates against Contract 3 `quiz/v1`.
8. Every block is already in canonical form (else `--fix` it).

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

Active in Phase 1: `hand`, `hands`, `auction`, `response-box`, front matter.
`quiz` is defined and hand-authorable but the picker that populates it is
Phase 2. `deal` is reserved and structurally linted but not resolved until
Phase 2. This is exactly the vocabulary the two seed lessons (Lessons 1–6
summary, New Minor Forcing intro) need.

## Open items for review

1. **Hand object alignment.** This freezes `{spades, hearts, diamonds, clubs}`
   as the shared shape (closing Contract 3 open item #1). Confirm the Contract 2
   components accept it directly rather than a PBN holding string.
2. **Auction source form.** Fixed W-N-E-S grid with `-`/`AP`. Confirm this
   reads/diffs better than a dealer-first ordered call list for real lessons;
   revisit after the New Minor Forcing intro (which has multi-round auctions).
3. **Suit glyphs in source.** Source uses ASCII strain letters (`1C`), render
   maps to glyphs; but `title`/prose/`response-box` free text may contain
   literal `♣`. Confirm lint/formatter leave author-entered glyphs untouched.
4. **Deal display options.** `show`/`rotate-south` are a first guess; finalize
   against the Contract 2 deal component when `deal` is wired in Phase 2.
