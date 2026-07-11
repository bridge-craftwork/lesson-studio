# Contract 3: Quiz JSON Schema

**Status:** Draft for review
**Owners:** Joint — Practice-Bidding-Scenarios (emits) and lesson-studio (embeds);
addendum to the bilateral deal-repository contract.
**Renderers:** `@bridge-craftwork/bridge-components` (Contract 2).
**Schema version:** `1` (`schema: "quiz/v1"`).
**Date:** 2026-07-11

---

## Purpose

Defines the JSON a quiz is serialized as when the Practice-Bidding-Scenarios
(PBS) build pipeline emits `quiz/*.json` alongside its existing BC-PBN output,
and the shape the lesson DSL `quiz` block embeds **by value** (Contract 1) and
the shared components render (Contract 2).

The pipeline is the conversion point because it holds quizzes in structured form
and can stamp provenance at generation time. Client-side parsing of BC-PBN was
rejected (see architecture doc, Alternatives Considered).

## Design: discriminated union over a shared envelope

Every quiz is one JSON object with:

1. a **shared envelope** carried by all quiz types (identity, prompt,
   provenance, tags), and
2. a **`type` discriminator** selecting a per-type `items[]` payload shape.

A validator dispatches on `type`: the envelope is checked once, then the
matching item schema is enforced. Adding a future quiz style is a new `type`
value plus its item schema — existing types and their consumers are untouched.

`quiz/v1` defines exactly **one** type, `bidding`, because that is the only
style the PBS pipeline generates today (given a hand and a context, what is your
call?). Other types are **reserved** below so the discriminator space is agreed
in advance; PBS emits them only once their item schema is added in a later
schema version.

## Envelope (all quiz types)

| Field | Req | Type | Notes |
|---|---|---|---|
| `schema` | ✓ | string const `"quiz/v1"` | Format + version tag. |
| `type` | ✓ | enum | Discriminator. `v1`: `"bidding"`. |
| `id` | ✓ | string | Stable slug, unique within the source `quiz/` folder (e.g. `"1C_WalshStyle"`). Used as the embed key and for staleness detection. |
| `title` | ✓ | string | Human title (e.g. `"Exercise One — Responding to 1♣"`). |
| `prompt` | ✓ | string | Shared instruction shown above all items (e.g. `"Partner opens 1♣. What do you bid with each hand?"`). Markdown-inline permitted; suit glyphs as Unicode (♣♦♥♠). |
| `skill_paths` | – | string[] | Taxonomy paths (Contract 4) this quiz exercises. Advisory; lesson front matter remains the authority for lesson-level tagging. |
| `provenance` | ✓ | object | See below. |
| `items` | ✓ | array | ≥1 item; shape determined by `type`. |

### `provenance` (all quiz types)

Stamped by the PBS pipeline at generation. Keeps embedded snapshots traceable
and staleness detectable without re-deriving the quiz.

| Field | Req | Type | Notes |
|---|---|---|---|
| `source` | ✓ | string const `"Practice-Bidding-Scenarios"` | Emitting repo. |
| `pipeline_version` | ✓ | string | PBS build/pipeline version that emitted this object. |
| `generated` | ✓ | string (date) | ISO 8601 date of generation. |
| `source_quiz` | ✓ | string | Origin file stem in `quiz/` (e.g. `"1C_WalshStyle"`). |

Per-**item** deal provenance (the bba-filtered board an item was cut from) lives
on the item, since one quiz mixes hands from many boards — see `bidding` items.

## Type: `bidding` (v1)

Items are independent problems sharing the envelope `prompt`. Each presents one
hand (optionally with auction context) and gives the expected call plus
explanation.

### `bidding` item

| Field | Req | Type | Notes |
|---|---|---|---|
| `hand` | ✓ | Hand | The hand to bid from. Canonical Hand object (below). |
| `seat` | – | enum `N`\|`E`\|`S`\|`W` | Seat the hand sits in; default `S`. |
| `dealer` | – | enum `N`\|`E`\|`S`\|`W` | For context display. |
| `vulnerability` | – | enum `None`\|`NS`\|`EW`\|`Both` | For context display. |
| `context` | – | Auction | Calls made before it is the solver's turn (e.g. partner's `1♣` opening). Omit for opening-bid problems. Same call notation as `answer`. |
| `answer` | ✓ | Call | The expected call. |
| `alternates` | – | Call[] | Also-acceptable calls, if the exercise allows more than one. |
| `explanation` | – | string | Prose rationale (markdown-inline, suit glyphs as Unicode). |
| `board` | – | BoardRef | The bba-filtered board this hand was cut from (below). |

### Canonical Hand object

Suit holdings top-down, ranks as characters, ten as `T`, void as `""`. This is
the representation Contract 1 (`hand` DSL block) and Contract 2 (rendering
components) share; it MUST match theirs.

```json
{ "spades": "AQ", "hearts": "A5", "diamonds": "8743", "clubs": "QJT95" }
```

### Call notation

A bid is `level` + `strain` with strain in `C D H S NT`; other calls are `P`
(pass), `X` (double), `XX` (redouble). Renderers convert `C/D/H/S` to glyphs.
Examples: `"1D"`, `"3NT"`, `"P"`, `"X"`. A quiz-JSON Call is a string in this
notation.

### Auction object (`context`)

```json
{ "dealer": "N", "calls": ["1C", "P"] }
```

`calls` is dealer-first, clockwise. `dealer` is optional if the item already
carries `dealer`.

### BoardRef (per-item deal provenance)

References the stable bba-filtered board identity per ADR-0001, so an item's
teaching hand stays traceable to its source deal.

| Field | Req | Type | Notes |
|---|---|---|---|
| `repo` | ✓ | string const `"Practice-Bidding-Scenarios"` | |
| `id` | ✓ | string | Stable board hash (the bba-filtered per-board identity, e.g. `"000B6835D55DDDE2A07889A2F0DF"`). |
| `event` | – | string | Source event/file stem for humans (e.g. `"1C_WalshStyle"`). |
| `board` | – | integer | Board number within the event. |

## Reserved future types (not defined in v1)

Agreed discriminator values so consumers can `switch` defensively; each ships
with its item schema in a later `quiz/vN`. PBS MUST NOT emit these under `v1`.

| `type` | Intended shape |
|---|---|
| `lead` | Full/partial deal + auction → opening lead card + explanation. |
| `play` | Deal + contract + auction → play problem (card or line). |
| `defense` | Deal + auction + early play → defensive card + explanation. |

## Manifest: `quiz/index.json`

The pipeline also emits a manifest so the Phase-2 quiz-picker can browse without
fetching every quiz.

```json
{
  "schema": "quiz-index/v1",
  "generated": "2026-07-11",
  "pipeline_version": "…",
  "quizzes": [
    { "id": "1C_WalshStyle", "title": "Exercise One — Responding to 1♣",
      "type": "bidding", "item_count": 8,
      "skill_paths": ["bidding_conventions/two_over_one"],
      "file": "1C_WalshStyle.json" }
  ]
}
```

Manifest entries are a projection of each quiz's envelope; they carry no
authoritative data of their own.

## Worked example

Grounded in `quiz/1C_WalshStyle.pbn` (Exercise One — Responding to 1♣).

```json
{
  "schema": "quiz/v1",
  "type": "bidding",
  "id": "1C_WalshStyle",
  "title": "Exercise One — Responding to 1♣",
  "prompt": "Partner opens 1♣. What do you bid with each of these hands?",
  "skill_paths": ["bidding_conventions/two_over_one"],
  "provenance": {
    "source": "Practice-Bidding-Scenarios",
    "pipeline_version": "0.0.0",
    "generated": "2026-07-11",
    "source_quiz": "1C_WalshStyle"
  },
  "items": [
    {
      "hand": { "spades": "AQ", "hearts": "A5", "diamonds": "8743", "clubs": "QJT95" },
      "seat": "S",
      "dealer": "N",
      "vulnerability": "None",
      "context": { "dealer": "N", "calls": ["1C", "P"] },
      "answer": "1D",
      "explanation": "Walsh: bypass the diamonds to show the four-card major cheaply on a weak hand — here, up the line with a genuine diamond suit and game interest, 1♦ keeps 1♥/1♠ available.",
      "board": {
        "repo": "Practice-Bidding-Scenarios",
        "id": "000B6835D55DDDE2A07889A2F0DF",
        "event": "1C_WalshStyle",
        "board": 1
      }
    }
  ]
}
```

## JSON Schema (draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://bridge-craftwork.github.io/contracts/quiz-v1.json",
  "title": "Bridge Quiz (quiz/v1)",
  "type": "object",
  "required": ["schema", "type", "id", "title", "prompt", "provenance", "items"],
  "additionalProperties": false,
  "properties": {
    "schema": { "const": "quiz/v1" },
    "type": { "enum": ["bidding"] },
    "id": { "type": "string", "minLength": 1 },
    "title": { "type": "string", "minLength": 1 },
    "prompt": { "type": "string", "minLength": 1 },
    "skill_paths": { "type": "array", "items": { "type": "string" } },
    "provenance": {
      "type": "object",
      "required": ["source", "pipeline_version", "generated", "source_quiz"],
      "additionalProperties": false,
      "properties": {
        "source": { "const": "Practice-Bidding-Scenarios" },
        "pipeline_version": { "type": "string" },
        "generated": { "type": "string", "format": "date" },
        "source_quiz": { "type": "string" }
      }
    },
    "items": { "type": "array", "minItems": 1 }
  },
  "allOf": [
    {
      "if": { "properties": { "type": { "const": "bidding" } } },
      "then": {
        "properties": {
          "items": {
            "type": "array",
            "minItems": 1,
            "items": { "$ref": "#/$defs/biddingItem" }
          }
        }
      }
    }
  ],
  "$defs": {
    "call": {
      "type": "string",
      "pattern": "^(P|X|XX|[1-7](C|D|H|S|NT))$"
    },
    "seat": { "enum": ["N", "E", "S", "W"] },
    "hand": {
      "type": "object",
      "required": ["spades", "hearts", "diamonds", "clubs"],
      "additionalProperties": false,
      "properties": {
        "spades": { "type": "string", "pattern": "^[AKQJT9-2]*$" },
        "hearts": { "type": "string", "pattern": "^[AKQJT9-2]*$" },
        "diamonds": { "type": "string", "pattern": "^[AKQJT9-2]*$" },
        "clubs": { "type": "string", "pattern": "^[AKQJT9-2]*$" }
      }
    },
    "auction": {
      "type": "object",
      "required": ["calls"],
      "additionalProperties": false,
      "properties": {
        "dealer": { "$ref": "#/$defs/seat" },
        "calls": { "type": "array", "items": { "$ref": "#/$defs/call" } }
      }
    },
    "boardRef": {
      "type": "object",
      "required": ["repo", "id"],
      "additionalProperties": false,
      "properties": {
        "repo": { "const": "Practice-Bidding-Scenarios" },
        "id": { "type": "string", "minLength": 1 },
        "event": { "type": "string" },
        "board": { "type": "integer" }
      }
    },
    "biddingItem": {
      "type": "object",
      "required": ["hand", "answer"],
      "additionalProperties": false,
      "properties": {
        "hand": { "$ref": "#/$defs/hand" },
        "seat": { "$ref": "#/$defs/seat" },
        "dealer": { "$ref": "#/$defs/seat" },
        "vulnerability": { "enum": ["None", "NS", "EW", "Both"] },
        "context": { "$ref": "#/$defs/auction" },
        "answer": { "$ref": "#/$defs/call" },
        "alternates": { "type": "array", "items": { "$ref": "#/$defs/call" } },
        "explanation": { "type": "string" },
        "board": { "$ref": "#/$defs/boardRef" }
      }
    }
  }
}
```

## Evolution rules

- **Additive within a version:** new *optional* fields may be added to
  `quiz/v1` without a version bump. New required fields, removed fields,
  changed semantics, or a new `type` require `quiz/v2` and an ADR-style review
  (this document is the review surface).
- **Discriminator is closed per version:** a consumer that meets an unknown
  `type` for its declared `schema` version SHOULD reject rather than guess.
- **Snapshots are immutable once embedded:** the DSL embeds by value; the
  `id` + `provenance.generated` let tooling flag a lesson whose snapshot lags
  the current pipeline output. Re-embedding is an explicit author action.

## Open items for review

1. **Hand representation source of truth.** This uses
   `{spades, hearts, diamonds, clubs}`. Contract 1's `hand` block and
   Contract 2's component props must adopt the identical shape; if the
   components already expect a different form (e.g. a PBN holding string),
   align all three here before David builds.
2. **`skill_paths` on quizzes.** Advisory only in v1. Confirm the pipeline can
   derive them (from source scenario metadata) or whether they are omitted at
   emit time and added later by lesson authors.
3. **Board identity field.** `board.id` uses the bba-filtered per-board hash.
   Confirm that hash is the canonical ADR-0001 stable identity to reference,
   vs. an event-stem + board-number composite.
