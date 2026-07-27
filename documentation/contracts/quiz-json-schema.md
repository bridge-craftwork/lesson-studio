# Contract 3: Quiz Lesson JSON Schema

**Status:** Draft for review
**Owners:** Joint — Practice-Bidding-Scenarios (emits) and lesson-studio (embeds);
addendum to the bilateral deal-repository contract.
**Renderers:** `@bridge-craftwork/bridge-components` (Contract 2).
**Schema version:** `1` (`schema: "quiz-lesson/v1"`).
**Date:** 2026-07-26 (supersedes the flat `quiz/v1` draft of 2026-07-11 — see
"Changes from the `quiz/v1` draft" below)

---

## Purpose

Defines the JSON the Practice-Bidding-Scenarios (PBS) build pipeline emits as
`quiz/{Scenario}.json` alongside its existing BC-PBN output, and the shape the
lesson DSL `quiz` block embeds **by value** (Contract 1) and the shared
components render (Contract 2).

The pipeline is the conversion point because it holds quizzes in structured form
and can stamp provenance at generation time. Client-side parsing of BC-PBN was
rejected (see architecture doc, Alternatives Considered).

## Design: the file is a lesson, and the hierarchy is real

One file per lesson (one PBS scenario), with three levels:

```
lesson  ->  exercise (a shared prompt)  ->  question (hand + answer)
```

The middle level is not decorative. The PBS generator finds each point in the
auction where our side faces a real decision, and gathers the hands that face
*that same decision* under one prompt — "Partner opens 1♣. What do you bid with
each of these hands?". Hands are only comparable to each other within such a
group. Flattening the groups away would throw out the one piece of structure the
generator exists to produce, and would force every consumer to re-derive it from
each question's `context` auction.

It also matches how lesson-studio consumes the data: an author opens a lesson,
picks roughly six questions from under a prompt, and saves that group into the
lesson document with the prompt attached. Producer, transport, and consumer all
use the same shape.

A lesson holds every exercise the scenario yielded — from one to about a hundred.
Selection is the author's job, not the pipeline's.

## Pagination and answer deferral (out of scope by design)

Quiz JSON carries **no pagination and no answer-placement markup**. Each question
embeds both the problem (`hand`, `context`, and its exercise's `prompt`) and its
answer (`answer`, `alternates`, `explanation`) as data; *where* the answer appears
is the consuming renderer's decision, not the schema's. The renderer (Contract 2)
implements the quiz/answer separation — rendering questions inline and deferring
answers to a generated section behind a page break — and the same JSON drives
every render variant (student print, teacher-inline, projection, interactive
tap-to-reveal). Keeping placement out of the JSON is what lets one snapshot serve
all of them; the BC-PBN's embedded page breaks are a print-format artifact that
never propagates into quiz JSON.

## Lesson envelope

| Field | Req | Type | Notes |
|---|---|---|---|
| `schema` | ✓ | string const `"quiz-lesson/v1"` | Format + version tag. |
| `id` | ✓ | string | The PBS scenario stem, unique within `quiz/` (e.g. `"1C_WalshStyle"`). Also the file stem, and the embed key for staleness detection. |
| `title` | ✓ | string | Human title, taken from the scenario's `.btn` button text (e.g. `"Walsh Style"`). |
| `skill_paths` | – | string[] | Taxonomy paths (Contract 4) this lesson exercises. Advisory; lesson front matter remains the authority for lesson-level tagging. |
| `provenance` | ✓ | object | See below. |
| `exercises` | ✓ | array | ≥1 exercise, in the order the auction reaches them. |

### `provenance`

Stamped by the PBS pipeline at generation. Keeps embedded snapshots traceable
and staleness detectable without re-deriving the lesson.

| Field | Req | Type | Notes |
|---|---|---|---|
| `source` | ✓ | string const `"Practice-Bidding-Scenarios"` | Emitting repo. |
| `pipeline_version` | ✓ | string | PBS build/pipeline version that emitted this object. |
| `generated` | ✓ | string (date) | ISO 8601 date of generation. Preserved across re-runs when nothing else changed, so identical rebuilds produce no diff. |
| `source_quiz` | ✓ | string | Origin file stem in `quiz/` (e.g. `"1C_WalshStyle"`). |

Per-**question** deal provenance (the bba-filtered board a hand was cut from)
lives on the question, since one exercise mixes hands from many boards.

## Exercise: a shared prompt over a discriminated union

| Field | Req | Type | Notes |
|---|---|---|---|
| `id` | ✓ | string | Stable slug, unique within the lesson: `{lesson id}-{n}`, `n` 1-based (e.g. `"1C_WalshStyle-2"`). |
| `type` | ✓ | enum | Discriminator selecting the `questions[]` payload shape. `v1`: `"bidding"`. |
| `title` | ✓ | string | Human title (e.g. `"Exercise One — Responding to 1♣"`). Suit glyphs as Unicode (♣♦♥♠). |
| `prompt` | ✓ | string | Shared instruction for every question in this exercise (e.g. `"Partner opens 1♣. What do you bid with each of these hands?"`). Markdown-inline permitted; suit glyphs as Unicode. |
| `questions` | ✓ | array | ≥1 question; shape determined by `type`. |

A validator dispatches on `type`: the lesson envelope and exercise fields are
checked once, then the matching question schema is enforced. Adding a future
quiz style is a new `type` value plus its question schema — existing types and
their consumers are untouched. The discriminator sits on the exercise rather
than the lesson so a single lesson can later mix, say, a bidding exercise and an
opening-lead exercise.

`quiz-lesson/v1` defines exactly **one** type, `bidding`, because that is the
only style the PBS pipeline generates today (given a hand and a context, what is
your call?). Other types are **reserved** below so the discriminator space is
agreed in advance; PBS emits them only once their question schema is added in a
later schema version.

## Type: `bidding` (v1)

Questions are independent problems sharing their exercise's `prompt`. Each
presents one hand with the auction it faces and gives the expected call.

### `bidding` question

| Field | Req | Type | Notes |
|---|---|---|---|
| `hand` | ✓ | Hand | The hand to bid from. Canonical Hand object (below). |
| `seat` | – | enum `N`\|`E`\|`S`\|`W` | Seat the hand sits in; default `S`. PBS emits the true seat from the source deal, which is **not** always South — scenario files deal from every seat. |
| `dealer` | – | enum `N`\|`E`\|`S`\|`W` | For context display. |
| `vulnerability` | – | enum `None`\|`NS`\|`EW`\|`Both` | For context display. |
| `context` | – | Auction | Calls made before it is this seat's turn (e.g. partner's `1♣` opening). Omit for opening-bid problems. Same call notation as `answer`. |
| `answer` | ✓ | Call | The expected call. |
| `alternates` | – | Call[] | Also-acceptable calls, if the exercise allows more than one. |
| `explanation` | – | string | Prose rationale (markdown-inline, suit glyphs as Unicode). Not emitted by PBS today; reserved for authored prose. |
| `board` | – | BoardRef | The bba-filtered board this hand was cut from (below). |

`seat`, `dealer`, and `context` are mutually consistent: `context.calls` is
dealer-first and clockwise, and runs exactly up to the moment `seat` must call.

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

`calls` is dealer-first, clockwise. `dealer` is optional if the question already
carries `dealer`.

### BoardRef (per-question deal provenance)

References the bba-filtered board a hand was cut from, so a teaching hand stays
traceable to its source deal.

| Field | Req | Type | Notes |
|---|---|---|---|
| `repo` | ✓ | string const `"Practice-Bidding-Scenarios"` | |
| `id` | ✓ | string | The board-version token PBS stamps as a bare `%` comment after `[Board]` — ADR-0001's rotation-independent, producer-owned token (e.g. `"000B6835D55DDDE2A07889A2F0DF"`). Opaque: consumers record it, never compute or compare it. |
| `event` | – | string | Source event/file stem for humans (e.g. `"1C_WalshStyle"`). |
| `board` | – | integer | Board number within the event. |

Per ADR-0001 the *identity* of a board is positional — `(collection, subfolder,
board number)`, carried here by `event` + `board`. `id` is a version token, not a
key.

## Reserved future types (not defined in v1)

Agreed discriminator values so consumers can `switch` defensively; each ships
with its question schema in a later `quiz-lesson/vN`. PBS MUST NOT emit these
under `v1`.

| `type` | Intended shape |
|---|---|
| `lead` | Full/partial deal + auction → opening lead card + explanation. |
| `play` | Deal + contract + auction → play problem (card or line). |
| `defense` | Deal + auction + early play → defensive card + explanation. |

## Manifest: `quiz/index.json`

The pipeline also emits a manifest so a lesson picker can browse without
fetching every lesson.

```json
{
  "schema": "quiz-index/v1",
  "generated": "2026-07-26",
  "pipeline_version": "1.0.0",
  "lessons": [
    { "id": "1C_WalshStyle", "title": "Walsh Style",
      "exercise_count": 4, "question_count": 24,
      "skill_paths": ["bidding_conventions/two_over_one"],
      "file": "1C_WalshStyle.json" }
  ]
}
```

Manifest entries are a projection of each lesson's envelope; they carry no
authoritative data of their own.

## Worked example

Grounded in `quiz/1C_WalshStyle.json`, trimmed to one question per exercise.

```json
{
  "schema": "quiz-lesson/v1",
  "id": "1C_WalshStyle",
  "title": "Walsh Style",
  "skill_paths": ["bidding_conventions/two_over_one"],
  "provenance": {
    "source": "Practice-Bidding-Scenarios",
    "pipeline_version": "1.0.0",
    "generated": "2026-07-26",
    "source_quiz": "1C_WalshStyle"
  },
  "exercises": [
    {
      "id": "1C_WalshStyle-1",
      "type": "bidding",
      "title": "Exercise One — Responding to 1♣",
      "prompt": "Partner opens 1♣. What do you bid with each of these hands?",
      "questions": [
        {
          "hand": { "spades": "754", "hearts": "K874", "diamonds": "AK65", "clubs": "A2" },
          "seat": "S",
          "dealer": "N",
          "vulnerability": "None",
          "context": { "dealer": "N", "calls": ["1C", "P"] },
          "answer": "1D",
          "board": {
            "repo": "Practice-Bidding-Scenarios",
            "id": "000B6835D55DDDE2A07889A2F0DF",
            "event": "1C_WalshStyle",
            "board": 1
          }
        }
      ]
    },
    {
      "id": "1C_WalshStyle-2",
      "type": "bidding",
      "title": "Exercise Two — Opener's Rebid after 1♦",
      "prompt": "You open 1♣, partner responds 1♦. What do you bid with each of these hands?",
      "questions": [
        {
          "hand": { "spades": "Q98", "hearts": "K73", "diamonds": "Q63", "clubs": "AK86" },
          "seat": "N",
          "dealer": "N",
          "vulnerability": "EW",
          "context": { "dealer": "N", "calls": ["1C", "P", "1D", "P"] },
          "answer": "1NT",
          "board": {
            "repo": "Practice-Bidding-Scenarios",
            "id": "0161412BD49C2F3D42E9B6748AD2",
            "event": "1C_WalshStyle",
            "board": 3
          }
        }
      ]
    }
  ]
}
```

## JSON Schema (draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://bridge-craftwork.github.io/contracts/quiz-lesson-v1.json",
  "title": "Bridge Quiz Lesson (quiz-lesson/v1)",
  "type": "object",
  "required": ["schema", "id", "title", "provenance", "exercises"],
  "additionalProperties": false,
  "properties": {
    "schema": { "const": "quiz-lesson/v1" },
    "id": { "type": "string", "minLength": 1 },
    "title": { "type": "string", "minLength": 1 },
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
    "exercises": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/exercise" }
    }
  },
  "$defs": {
    "exercise": {
      "type": "object",
      "required": ["id", "type", "title", "prompt", "questions"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "type": { "enum": ["bidding"] },
        "title": { "type": "string", "minLength": 1 },
        "prompt": { "type": "string", "minLength": 1 },
        "questions": { "type": "array", "minItems": 1 }
      },
      "allOf": [
        {
          "if": { "properties": { "type": { "const": "bidding" } } },
          "then": {
            "properties": {
              "questions": {
                "type": "array",
                "minItems": 1,
                "items": { "$ref": "#/$defs/biddingQuestion" }
              }
            }
          }
        }
      ]
    },
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
        "spades": { "type": "string", "pattern": "^[AKQJT2-9]*$" },
        "hearts": { "type": "string", "pattern": "^[AKQJT2-9]*$" },
        "diamonds": { "type": "string", "pattern": "^[AKQJT2-9]*$" },
        "clubs": { "type": "string", "pattern": "^[AKQJT2-9]*$" }
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
    "biddingQuestion": {
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
  `quiz-lesson/v1` without a version bump. New required fields, removed fields,
  changed semantics, or a new `type` require `quiz-lesson/v2` and an ADR-style
  review (this document is the review surface).
- **Discriminator is closed per version:** a consumer that meets an unknown
  `type` for its declared `schema` version SHOULD reject rather than guess.
- **Snapshots are immutable once embedded:** the DSL embeds by value; the `id` +
  `provenance.generated` let tooling flag a lesson whose snapshot lags the
  current pipeline output. Re-embedding is an explicit author action.

## Changes from the `quiz/v1` draft (2026-07-11)

Made before any consumer was written, so no migration is required.

1. **The file is a lesson, not a single quiz.** `quiz/{Scenario}.json` replaces
   `quiz/{Scenario}-{n}.json`. Emitting one file per exercise produced 6,540
   files for 314 scenarios; the lesson is the natural unit for both the producer
   and the studio.
2. **`items[]` became `exercises[] -> questions[]`.** The prompt grouping the
   generator produces is now represented instead of being flattened away.
3. **`type`, `title`, `prompt` moved from the envelope to the exercise.** The
   lesson envelope keeps identity and provenance; the discriminator belongs with
   the payload it selects.
4. **Manifest lists lessons, not quizzes** — `lessons[]` with `exercise_count`
   and `question_count`, replacing `quizzes[]` with `item_count`.
5. **Fixed the Hand rank pattern.** It was `^[AKQJT9-2]*$`; `9-2` is a reversed
   character range that no ECMA or PCRE engine will compile. Now `^[AKQJT2-9]*$`.
6. **Corrected the worked example.** The 2026-07-11 example paired board
   `000B6835…` with `AQ.A5.8743.QJT95` — the hand that *opened* 1♣ — under the
   prompt "Partner opens 1♣". It was copied from PBS output that read the quizzed
   hand from a hardcoded seat. The responder's hand on that board is
   `754.K874.AK65.A2`; PBS now derives the seat from each board's dealer.
7. **`board.id` documented as ADR-0001's board-version token**, resolving open
   item 3 below: it is the `%` comment PBS stamps after `[Board]`, and it is a
   version token rather than the board's identity.

## Open items for review

1. **Hand representation source of truth.** This uses
   `{spades, hearts, diamonds, clubs}`. Contract 1's `hand` block and Contract 2's
   component props must adopt the identical shape; if the components already
   expect a different form (e.g. a PBN holding string), align all three here
   before David builds.
2. **`skill_paths` on lessons.** Advisory only in v1. PBS reads a `skill-path`
   property from the scenario's `.dlr` and omits the field when absent — which is
   every scenario today, since the taxonomy has not been minted.
3. **Exercise volume.** Lessons range from 1 to ~85 exercises (mean 21). If the
   studio's picker wants a pre-narrowed set, PBS could rank or cap exercises at
   emit time; today it emits everything and leaves selection to the author.
