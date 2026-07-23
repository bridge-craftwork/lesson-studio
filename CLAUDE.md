# lesson-studio — working notes

Authoring app **and DSL definition** for the Bridge Classroom lesson library.
A Vue 3 + Vite app embedding **Milkdown** (ProseMirror + remark, markdown-native
storage) that renders bridge blocks — hands, auctions, response boxes — as live
components, and prints them to one-page PDF lessons.

**Live (auto-deploys from `main`):** https://bridge-craftwork.github.io/lesson-studio/

## The two repos

| Repo | Role |
|---|---|
| **lesson-studio** (this) | The app + the DSL grammar + the print pipeline + the lint tool. All application code lives here. |
| **lesson-library** (`../lesson-library`) | **Content only.** CC0 lessons at `lessons/<slug>/<slug>.md`, plus a CI lint workflow. No app code. |

They're joined by four versioned contracts in `documentation/contracts/` —
**read those first**; they're the durable design, more than the code is:

1. **`dsl-grammar.md`** (Contract 1) — the lesson DSL. Owned here.
2. **`component-api.md`** (Contract 2) — the Bridge-Classroom component props.
3. **`quiz-json-schema.md`** (Contract 3) — quiz JSON (PBS emits, we embed).
4. **`taxonomy-and-front-matter.md`** (Contract 4) — skill paths + front matter.

Broader design: `documentation/lesson-library-architecture.md` (phased roadmap).
Planned UX direction: `documentation/lobby-and-session.md` (captured, not built).

## Commands

```bash
npm run dev            # editor at :5173  (also /gallery.html, /print.html)
npm run build          # vue-tsc typecheck + Vite build (3 entries)
npm test               # vitest — DSL parsers + Milkdown round-trip
npm run lint:lessons -- ../lesson-library/lessons     # the CI lint, locally
npm run print:pdf -- --lesson <file.md> --out out.pdf # needs a server running
npm run pdf:attach  -- --pdf out.pdf --lesson <file.md>  # embed source after the fact
npm run pdf:extract -- --pdf out.pdf --out recovered.md  # pull it back out
```

`print:pdf` needs a dev/preview server up and a one-time
`npx playwright install chromium`.

## Layout

```
src/dsl/        Contract 1 parsers + adapters + validate.ts  (pure, Node-safe)
                schema.ts = the authorable keys, machine-readable
src/blocks/     Milkdown node views — how blocks render/edit live in the editor
src/render/     BlockView.vue — the shared render path (gallery + print + editor)
src/bridge/     Contract 2 components; vendor/ = real Bridge-Classroom snapshot
src/editor/     LessonDocument, front-matter panel, Milkdown wiring
src/lesson/     session state, file I/O (File System Access), localStorage drafts
src/print/      print view + stylesheet   |  src/gallery/  block gallery
scripts/        print-pdf.mjs, lint-lessons.ts
```

Three page entries: `index.html` (editor), `gallery.html`, `print.html`.

## Non-obvious things (learned the hard way)

- **`--table-scale` must be defined.** The bridge components size everything as
  `calc(Npx * var(--table-scale))`. If that var is undefined the calc is
  *invalid* and width/font silently fall back — hands lose their fixed suit
  column and render ragged. It's set in `src/styles/app.css` (`:root`, 0.62);
  auctions override to 0.86 because their native bid size (18px) differs from
  the hand's card size (24px). **One global scale can't serve both.**
- **AuctionTable has a "dense" mode** below `280 × scale` container width that
  shrinks bids. Give auction figures a definite width or they trip it. The
  sensor watches the *parent*, so any shrink-wrapping ancestor makes it measure
  itself and latch (the gallery does this). `columns: 2` auctions are exempt.
- **Milkdown's parser matches node specs in REGISTRATION ORDER**, and `priority`
  does *not* apply to markdown parsing. Bridge blocks must be `.use()`d
  **before** `commonmark` or the generic code_block wins.
- **Milkdown's listener never fires on initial mount** — only on real edits. Do
  not treat the first emission as a "clean baseline"; it's the user's first edit.
- Vue **watchers flush asynchronously**, so a sync guard flag won't cover a
  reset that triggers a deep watcher — clear such guards on `nextTick`.
- The `row` block uses a **four-backtick fence** so it can contain
  three-backtick blocks. It round-trips byte-identically (there's a test).
- Suit glyphs: only **♥/♦ are red**, and only the glyph — never the level digit
  or an annotation superscript.

## Conventions

- **Lessons have no body `# H1`** — the front-matter `title` is the page
  heading; a body H1 duplicates it.
- **Auction annotations use PBN `=1=`** (`2D =1=`), matching PBN note
  references. Legacy `^1` still parses but isn't canonical. A bare `2D!` marks
  an alert with no note text — teaching-material meaning, *not* PBN's
  move-quality one, which the same syntax carries there.
- **Uncontested auctions can print two-column** (`columns: 2`, plus `labels:`
  and `grid: off`), the convention in most teaching material. The source keeps
  every call including the opponents' passes; eliding them is display-only, and
  a competitive auction silently falls back to four columns.
- **Skill paths must exist in the taxonomy.** Validated against a **STOPGAP**
  `src/dsl/taxonomy.json` (48 paths extracted from Bridge-Classroom's
  `bakerBridgeTaxonomy.js`) until Contract 4 publishes the canonical one.
- **Print columns are per-lesson** via front-matter `columns:` (default 2).
  More columns ≠ fewer pages: narrow columns wrap tables *taller*. Trim content
  instead.
- **PDFs carry their own source.** `print:pdf` attaches four things: the lesson
  `.md` (byte-exact, so the lesson reconstructs from the PDF alone), a
  provenance sidecar, a **block click-map**, and the hands as **PBN**. All via
  `/EmbeddedFiles` (as ZUGFeRD invoices carry their XML), tagged with
  `AFRelationship` so a reader finds them by role, not by filename. Attachments
  already in the PDF (your own PBNs) are left untouched.
- **Not in the text layer** — extraction there loses newlines and leading
  whitespace, which the DSL needs. The browser's own print dialog cannot attach
  files at all; use `pdf:attach` afterwards.
- **Block positions come from link annotations, not from measuring the DOM.**
  The print view is CSS multicol under `@page`, so the print engine paginates
  and `break-inside: avoid` moves blocks — JS can't see any of it. Each block is
  wrapped in a `lesson-block:<n>` anchor before printing and Chrome emits a link
  annotation per page with an exact PDF-space rect. Only **leaf** blocks are
  wrapped (nested anchors are invalid HTML, and the hand inside a `row` is what
  you'd tap); the anchor *replaces* the element rather than wrapping it, or the
  `.ProseMirror > *:has(...)` column-span rule stops matching.
- pdf-lib **appends** attachments rather than replacing, and never collects
  unreferenced objects, so re-embedding must unlink from **both** the name tree
  and the catalog `/AF` array *and* delete the old streams — otherwise the file
  grows on every render while the entry counts still look right.
- **A new block key means editing `src/dsl/schema.ts` too.** It's what the
  editor's key reference and autocomplete read; a key that isn't there exists
  but is undiscoverable while authoring. It documents, it does *not* parse —
  the hand-written parsers stay authoritative and accept legacy forms the
  schema doesn't describe.
- Every DSL block must **round-trip losslessly** through Milkdown. Blocks store
  their body verbatim in node attrs; parsers are permissive, serializers emit a
  canonical form.

## Components (Contract 2)

`src/bridge/vendor/` is a **snapshot copy** of the real Bridge-Classroom
components (`HandDisplay`, `AuctionTable` + closure), taken deliberately rather
than aliasing a sibling checkout so their concurrent refactor can't destabilize
us. `HandsCompass`, `ResponseBox`, `QuizSnapshot` have no upstream equivalent
and remain lesson-studio placeholders.

**Do not hand-edit `vendor/`** except as documented deltas — `vendor/README.md`
lists them (marked `LESSON-STUDIO DELTA` in-file); re-apply after any re-copy.

**lesson-studio is a first-class client of the component library.** Prefer
proposing an *additive prop* over reaching into component internals (class
names, CSS vars) — internals break silently at the next snapshot. Pending asks
are listed in Contract 2. **Structured per-block editing must edit the DSL
model** and re-render through props, never the component's rendered DOM.

## Status

Phase 1 is essentially complete: 4 contracts, editor with live + **source-editable**
blocks, front-matter panel, file management (New/Open/Save + draft autosave),
block gallery, print → PDF, hosted, CI lint.

PR #1 merged 2026-07-22: lesson-library `main` now carries its first content —
New Minor Forcing (`published`) and the Lessons 1–6 summary (`draft`) — plus the
CI lint, which passed its first live run. Not yet done: pdf-handouts
integration, branch protection, and all of Phase 2 (publish the component
package + real taxonomy JSON, wire `deal`, the quiz-picker with David's PBS
emitter, volunteer submit flow).

## Working style that fits this project

Verify rendering changes by **driving the real app** (Playwright) and measuring,
not by reasoning about CSS — several bugs here were invisible in code review and
obvious in a measurement (the `--table-scale` fallback, the footnote-driven
width). `npm run print:pdf` doubles as an end-to-end check: it fails on any
block that won't render.
