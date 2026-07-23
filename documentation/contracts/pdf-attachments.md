# Contract 5: PDF Lesson Attachments

**Status:** Draft for review
**Owner:** lesson-studio (the print pipeline emits). **Expected to move** to the
presentation tool once that exists — see *Ownership handover* below.
**Consumers:** the projection/card-play tool (planned), the pdf-handouts
pipeline (must preserve), any PBN-reading tool the author already runs.
**Payload version:** `1` (`version` in `lesson-blocks.json`).
**Date:** 2026-07-23

---

## Purpose

Defines what a lesson PDF carries **inside itself**, so a downstream tool can
work from the PDF alone — reconstruct the lesson, locate each bridge figure on
the page, and hand a specific deal to a card-playing tool — without re-rendering
the lesson or reaching back to the library.

The motivating case: a lesson PDF on a projector, where tapping a hand opens it
in a card-play tool so individual cards can be played from the lesson.

## Why attachments and not the text layer

The source is carried as **PDF embedded files** (the `/EmbeddedFiles` name tree,
the mechanism PDF/A-3 and ZUGFeRD invoices use), never as hidden or
small-print text on the page.

This is a correctness decision, not a preference. PDF text extraction does not
reliably preserve newlines, leading whitespace, or run order — and the lesson
DSL is whitespace-sensitive: suit holdings, fence indentation, and the `---`
separator between an auction's calls and its notes all carry meaning. A
text-layer copy would appear recoverable and silently not be. An attachment is
byte-exact by construction.

## The four attachments (normative)

| File | `AFRelationship` | MIME | Contents |
|---|---|---|---|
| `lesson-source.md` | `/Source` | `text/markdown` | The lesson file, byte-for-byte |
| `lesson-provenance.json` | `/Supplement` | `application/json` | What produced this PDF |
| `lesson-blocks.json` | `/Data` | `application/json` | Where each block is, and its DSL |
| `lesson-hands.pbn` | `/Data` | `application/x-pbn` | The lesson's hands as PBN deals |

`lesson-hands.pbn` is **omitted** when a lesson contains no hands. The other
three are always present on an embedded render.

### Discovery (normative)

A consumer SHOULD locate the source by **`AFRelationship`**, not by filename:
find the entry in the document catalog's `/AF` array whose relationship is
`/Source`. Filenames are stable within this version and are a reasonable
fallback, but the relationship tag is the contract.

Attachments this contract does not name MUST be left untouched by any producer
implementing it. Lesson PDFs are expected to carry the author's own PBN files
alongside these.

### `lesson-provenance.json`

```json
{
  "generator": "lesson-studio",
  "generatorVersion": "0.1.0",
  "dslSpec": "contract-1/v1",
  "sourceFile": "new-minor-forcing.md",
  "renderedAt": "2026-07-23T01:02:27.521Z"
}
```

A PDF outlives the context that produced it. `dslSpec` says which grammar the
embedded markdown was valid against, so a consumer meeting a future DSL knows
whether it can parse what it found rather than guessing.

### `lesson-blocks.json` — the click map

```json
{
  "version": 1,
  "pageCount": 1,
  "pageSize": [[612, 792]],
  "coordinateSpace": "pdf-points, origin bottom-left",
  "blocks": [
    {
      "index": 0,
      "kind": "auction",
      "page": 1,
      "rect": [42, 235.5, 201, 366],
      "body": "dealer: N\ncolumns: 2\nlabels: Opener, Responder\n…"
    }
  ],
  "unlocated": []
}
```

| Field | Meaning |
|---|---|
| `version` | Contract 5 payload version. Dispatch on this before trusting the rest. |
| `pageCount` | Pages in the PDF. |
| `pageSize` | `[width, height]` in points, **per page** — pages need not match. |
| `coordinateSpace` | Always `pdf-points, origin bottom-left` in version 1. |
| `blocks[].index` | Document order of leaf blocks, 0-based. Also the PBN board number − 1. |
| `blocks[].kind` | The Contract 1 block tag (`hand`, `auction`, `response-box`, …). |
| `blocks[].page` | 1-based page number. **Absent** if unlocated. |
| `blocks[].rect` | `[x1, y1, x2, y2]` in PDF points, origin bottom-left. **Absent** if unlocated. |
| `blocks[].body` | The block's DSL body verbatim — parse with Contract 1. |
| `unlocated` | Indices with no position. Empty in the normal case. |

**`unlocated` is normative, not diagnostic.** A block whose position could not
be determined appears in `blocks` with its `body` but no `page`/`rect`, and its
index is listed here. A consumer MUST NOT infer a position for such a block; it
should fall back to non-positional use of the body. This exists so the map can
never quietly imply full coverage it does not have.

**Coordinates are PDF-space, not DOM-space.** Origin bottom-left, y increasing
upward. A consumer working in top-left screen coordinates converts with
`y_screen = pageHeight − y_pdf`.

**Leaf blocks only.** A `row` block is a layout container; the map records the
blocks *inside* it, since those are what a reader would tap. No entry in
`blocks` ever contains another.

### `lesson-hands.pbn`

One PBN game record per `hand`/`hands` block, in document order.

- `[Board "n"]` is the block's **1-based document position**, so board `n`
  corresponds to `blocks[].index === n − 1`. This is the join between the two
  files.
- Hands the lesson does not specify are written `-`, per PBN. Lesson hands are
  usually a single seat, and **no cards are ever invented** to complete a deal.
- The mandatory PBN tag set is emitted with `?` placeholders where a lesson has
  nothing to say, which is conventional for PBN exporters.
- An `[Auction]` section is included **only** when the lesson contains exactly
  one auction. With several, the pairing of auction to hand is not determinable
  from the source, and a guessed pairing would be worse than none.

## Positions come from the print engine (normative rationale)

Producers MUST NOT derive `rect`/`page` by measuring the DOM.

The print view is CSS multi-column under `@page`; the browser's print engine
decides where pages break, and `break-inside: avoid` on bridge blocks moves them
between columns and pages. None of that is observable from JavaScript, so DOM
measurement is correct only for a single-page lesson and silently wrong beyond
it.

The reference implementation instead wraps each leaf block in a
`lesson-block:<index>` link before printing and reads back the **link
annotations** the print engine emits — one per link, attributed to the page it
was actually laid out on, with a rect in PDF space. The engine that did the
layout reports the layout.

### Link annotations are part of the artifact

Those `lesson-block:<index>` links are **left in the PDF**. A viewer that
surfaces the URI makes the printed handout tappable with no companion file at
all, and the annotation rects are a redundant in-band copy of the click map.

Consumers MAY use either the annotations or `lesson-blocks.json`; they carry the
same rects and are generated together. The JSON additionally carries the DSL
body, which annotations cannot.

## Preservation obligation (pdf-handouts and other rewriters)

Any pipeline stage that rewrites a lesson PDF — adding headers, footers, page
numbers, or merging handouts — **MUST preserve the `/EmbeddedFiles` name tree
and the `/AF` array**, or the artifact stops being reconstructable and the
projection tool loses its input.

This is the one obligation this contract places on a party other than the
producer. It is **unverified as of this writing**: pdf-handouts is not yet
wired up, and many PDF tools drop attachments on rewrite. Verify with
`npm run pdf:extract -- --pdf <output>` on any stage's output before relying on
it. If a stage cannot preserve them, the correct fix is to re-attach downstream
of that stage rather than to move the payload into the text layer.

## Producing and consuming

```bash
npm run print:pdf   -- --lesson lesson.md --out out.pdf   # render + attach
npm run print:pdf   -- --lesson lesson.md --out out.pdf --no-embed
npm run pdf:attach  -- --pdf out.pdf --lesson lesson.md   # attach after the fact
npm run pdf:extract -- --pdf out.pdf --out recovered.md   # read back
npm run pdf:extract -- --pdf out.pdf --info               # provenance only
```

`pdf:attach` exists because **the browser's own print dialog cannot attach
files**. Nothing in HTML, CSS, or JavaScript can add an attachment to a PDF the
browser generates; a lesson printed with Cmd+P must have its payload added
afterwards.

Re-attaching is idempotent: a producer MUST replace its own attachments rather
than appending, and MUST delete the superseded streams, or the file grows on
every render.

## Versioning and evolution

- Adding an attachment, or an optional field to an existing one, is **MINOR**.
  Consumers MUST ignore fields they do not recognize.
- Renaming or removing an attachment, changing `coordinateSpace`, or changing
  the `index` ↔ `[Board]` correspondence is **MAJOR** and reviewed here.
- The block `kind` values and `body` grammar are Contract 1's; this contract
  does not restate them and changing them is a Contract 1 change.

## Ownership handover

This contract lives in lesson-studio because lesson-studio currently both
produces and defines it. When the presentation/card-play tool is built it
becomes the primary consumer, and this document should move to sit beside it —
the same way Contract 3 is owned jointly by the emitter and the embedder.

What should **not** move is the production side: the click map can only be
generated where the print engine runs, which is here.

## Open items for review

1. **pdf-handouts preservation — unverified.** The central risk. Confirm the
   handouts pipeline preserves attachments, and if not, decide whether it
   re-attaches or whether lesson-studio runs after it.
2. **Link annotations: keep or strip?** Kept, on the argument that a tappable
   handout needs no companion file. If stray `lesson-block:` URIs prove
   confusing in ordinary PDF viewers, a `--no-links` producer flag is the
   escape hatch.
3. **Auction-to-hand association.** Currently all-or-nothing (one auction, or
   none). If lessons routinely pair a specific hand with a specific auction, the
   DSL would need to express that link — a Contract 1 change, not one this
   contract can solve.
4. **Partial-hand PBN.** `-` for unknown hands is valid PBN, but confirm the
   card-play tool accepts a one-hand deal rather than requiring all four.
5. **Board numbering.** `[Board "n"]` is document position, so it changes when a
   lesson is edited. If the card-play tool wants stable identity across
   revisions, that needs a durable per-block id in Contract 1.
