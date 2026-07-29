# Quiz Picker & Quiz/Answer Layout — implementation plan

**Status:** Q1 + Q2 + Q3 implemented (2026-07-29). Q1 — `quiz-embed/v1` block
shape, parser/serializer (`src/dsl/quiz-block.ts`), renderer (`QuizSnapshot.vue`),
validate/schema updates. Q2 — source-lesson parser (`src/dsl/quiz-lesson.ts`),
the picker (`src/editor/QuizPicker.vue`), ribbon Quiz → picker, one block per
exercise. Q3 — remembered PBS `quiz/` folder + `index.json` manifest browsing
(`src/lesson/useQuizSource.ts`, `handles.ts` directory `role`, `parseQuizManifest`),
two-phase picker (browse lessons → pick questions), single-file fallback.
Q4 — document answer section: front-matter `quiz-answers: end|inline|none`
(default end; panel control + serialization), `collectQuizAnswers`, a
`QuizAnswers.vue` section rendered after the multicol body with `break-before:
page`, body answers hidden via CSS in end/none, preview page-count includes it.
Verified: 113 unit tests + Playwright (round-trip, render, select→insert,
manifest list/filter/open, folder role separation, and the print view — body
answers hidden, answer section on a new page grouped by prompt with alternates).
Native directory/JSON pickers + disk reads are the manual-test step (headless
can't drive them). **All four phases done.**
**Date:** 2026-07-29
**Contracts touched:** Contract 1 (DSL `quiz` block body), Contract 3 (quiz JSON,
already `quiz-lesson/v1`). Contract 2 renderer (`QuizSnapshot`) placeholder.

The goal: open a PBS quiz JSON, pick questions under a prompt, insert them as a
`quiz` block, and print with the quizzes on early pages and their answers
collected on later pages.

## Decisions locked (2026-07-29, Rick)

1. **Embed unit** — one `quiz` block = **one exercise**: its shared `prompt`
   plus the subset of questions you selected under it. Multiple quiz blocks per
   document. (Matches Contract 3's "pick ~6 under a prompt" model.)
2. **Answer layout** — by default, all answers across the document gather into a
   single **"Answers" section at the document end, behind a page break**.
   Front-matter overrides the mode.
3. **Source** — a **remembered `quiz/` folder + its `index.json` manifest**
   (the Phase C folder-remember pattern), so all 314 lessons browse without
   loading each file. One-off Open… of a single JSON is a secondary path.

## Where the current code stands

- The `quiz` block is a **Phase-1 placeholder on the old flat `quiz/v1` shape**
  (`{schema:"quiz/v1", type, items:[{hand, answer, explanation}]}`):
  - `src/bridge/QuizSnapshot.vue` renders `{title, prompt, items[]}` with a
    per-block `variant` (student defers answers *within the block*, teacher
    inline, projection none).
  - `src/render/BlockView.vue:69` does `JSON.parse(props.body)` and renders
    `<QuizSnapshot variant="student">` — variant hardcoded.
  - `src/dsl/validate.ts:137` enforces `schema === "quiz/v1"`, `type`, `items[]`.
  - `src/dsl/schema.ts:138` documents the flat example.
- **None of this matches `quiz-lesson/v1`** (exercise→questions; hand as
  `{spades,hearts,diamonds,clubs}`; answer as a Call string; `context` auction;
  `board`). All four sites change.
- Reserved blocks store their body **verbatim** in one node attr and must
  **round-trip losslessly** through Milkdown (blocks are atoms). The quiz body
  is JSON, so canonical-form serialization = `JSON.stringify(…, null, 2)`.

## The embedded block body (Contract 1 addition)

A quiz block stores **one exercise, trimmed to the selected questions, by
value**, wrapped with just enough provenance for staleness detection:

```json
{
  "schema": "quiz-embed/v1",
  "source": { "lesson_id": "1C_WalshStyle", "generated": "2026-07-26", "pipeline_version": "1.0.0" },
  "exercise": {
    "id": "1C_WalshStyle-1",
    "type": "bidding",
    "title": "Exercise One — Responding to 1♣",
    "prompt": "Partner opens 1♣. What do you bid with each of these hands?",
    "questions": [ /* the picked bidding questions, verbatim (hand, seat, context, answer, board, …) */ ]
  }
}
```

- **Embed by value** (Contract 1/3): the lesson reconstructs from the `.md`
  alone. `source` + `exercise.id` + `source.generated` let tooling flag a
  snapshot that lags current PBS output; re-embedding is an explicit author act.
- Questions are copied **verbatim** from the source lesson (including `board`,
  `context`, `alternates`), so no data is lost and re-embed is a clean diff.
- Supersedes flat `quiz/v1`. No migration needed — no lesson embeds a quiz yet.

## Build phases

### Q1 — DSL shape + renderer (the foundation)
- **`src/dsl/quiz-block.ts`** (new): `parseQuizBlock(body)` → typed
  `{source, exercise}`; permissive (accept the object, tolerate missing
  optionals), `serializeQuizBlock` → canonical pretty JSON. Reuse the Contract 3
  field checks.
- **`src/dsl/validate.ts`**: replace the `quiz/v1` branch with `quiz-embed/v1`
  (schema const, `source`, one `exercise` of `type:"bidding"`, each question a
  valid bidding question). Keep messages authoring-friendly.
- **`src/dsl/schema.ts`**: update the `quiz` entry's `example`/`bodyDoc` to the
  new shape (this is what the ribbon seeds and autocomplete reads).
- **Rewrite `QuizSnapshot.vue`** to the exercise shape: prompt header, then each
  question as a hand + its `context` auction (mini `AuctionTable`) with
  seat/vulnerability, and the `answer` (a `CallLabel`). Answer **visibility** is
  a prop: `inline | deferred | hidden`. It renders *no* answer section of its
  own when `deferred` — the document owns that (Q4).
- **Round-trip test** (like `hand.roundtrip.test.ts`) using a real trimmed PBS
  exercise as the fixture.

### Q2 — the picker (open one JSON → select → insert)
- **`QuizPicker.vue`** (modal over the editor): given a loaded `quiz-lesson/v1`
  object, list exercises (prompt as the group header); under each, its questions
  as selectable cards (hand + answer). Select ~any subset; "Insert selected"
  builds a `quiz-embed/v1` body for **each exercise that has selections** and
  inserts one quiz block per exercise via the existing
  `LessonDocument.insertBlock(tag, body)` path (ribbon → `insertBlock`).
- The ribbon's **Quiz** button opens the picker instead of seeding a placeholder
  (needs a source loaded first — see Q3; fall back to Open… a JSON).
- Selection smarts: a per-exercise "select first 6" and "select all", a running
  count, and a cap hint (a printed quiz is ~6 hands).

### Q3 — remembered `quiz/` folder + manifest browsing
- Reuse **`handles.ts`** directory persistence (Phase C) with a distinct role
  (`kind:'directory'` + a `role:'quiz'` tag, or a second well-known key) so the
  quiz folder and the lesson-library folder don't collide.
- **`src/lesson/quizLibrary.ts`** (new): read `index.json` (`quiz-index/v1`) →
  list `{id, title, exercise_count, question_count, file}`; open one lesson file
  on demand. Mirror `lessonLibrary.ts` (query-permission at mount, grant on
  click).
- Picker step 1 becomes: browse the manifest (title + counts, filterable) →
  open a lesson → step 2 (select questions).
- Entry points: the ribbon **Quiz** button, and optionally a Lobby affordance to
  set the folder.

### Q4 — document-level answer section (the "answers on later pages" smarts)
- **Front-matter `quiz-answers: end | inline | none`** (default `end`), resolved
  alongside the other print options. `end` → deferred; `inline` → answers under
  each quiz; `none` → omit (projection).
- **Numbering:** quizzes number continuously across the document (Q1…Qn in block
  order, then question order within a block). The answer section mirrors those
  numbers. Compute in the shared render path so preview and print agree.
- **Print pipeline** (`PrintView.vue` + `flattenLessonBlocks`/`wrapBlocksForPrint`):
  in `end` mode, after the body, inject a generated **Answers** section preceded
  by a `pagebreak`-style `column-span:all` spanner (the same mechanism
  `pagebreak` uses — `break-before:page` is ignored inside multicol otherwise).
  The section lists every quiz question's number → answer (+ `alternates`,
  `explanation` when present).
- Exclude the generated section from the PDF click-map (like other layout
  blocks, via `isLayoutBlock` parity in markBlocks/wrap/flatten).
- **Preview caveat (document):** the live preview page count does **not** account
  for forced page breaks (CLAUDE.md), so a doc with a deferred answer section
  under-counts pages in preview; Print shows the true count. Note it in the UI.

## Verification
- Unit: quiz-block parse/serialize round-trip, validate.ts accept/reject, numbering.
- Playwright: insert a quiz from a real PBS fixture, render inline/deferred/none,
  confirm the answer section lands behind a page break and numbers line up.
  Drive the real app and measure (repo working style).

## Open questions (surface before/while building)
1. **Context auction display** — full mini `AuctionTable`, or a compact
   "after 1♣–P" line? Auctions cost vertical space; a printed quiz packs ~6.
2. **Per-question metadata** — show seat/vulnerability on every question, or
   only when they vary within the exercise?
3. **Staleness UX** — passive (a badge when `source.generated` < manifest), or
   an active "refresh from source" action? Q1 stores enough either way.
4. **Board provenance** — keep per-question `board` in the embed (traceability,
   Contract 5 spirit) or drop it to shrink the body? Plan assumes keep.
5. **`Found_Endplay`** — its questions carry no `board`; confirm that's intended
   on the PBS side or a pipeline gap to fix before authors rely on it.
