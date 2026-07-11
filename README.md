# lesson-studio

The authoring application and DSL definition for the Bridge Classroom lesson
library. A Vue app embedding [Milkdown](https://milkdown.dev/) (ProseMirror +
remark, markdown-native storage) that lets volunteers compose one-page bridge
topic introductions with live-rendered bridge blocks — hands, auctions,
quizzes, and convention response boxes — using the shared Bridge Classroom
component library.

Companion content repository:
[`lesson-library`](https://github.com/bridge-craftwork/lesson-library) (CC0).

## What this repo owns

- **DSL specification** (Contract 1) — CommonMark plus reserved fenced blocks
  (`hand`, `hands`, `auction`, `deal`, `quiz`, `response-box`). Grammar and
  parser are versioned together here.
- **Milkdown editor app** — custom fenced-block plugins render bridge blocks as
  live Vue node views.
- **Print view** — the same components under a print stylesheet, rendered to PDF
  via Playwright, feeding the `pdf-handouts` pipeline for page chrome.
- **Editor plugins** — template starter and (Phase 2) quiz-picker.

## Architecture

The full design — repository structure, the four versioned contracts, the
publishing workflow, and the phased roadmap — lives in
[documentation/lesson-library-architecture.md](documentation/lesson-library-architecture.md).
Start there.

## Status

Phase 1 (prove the core) — not yet started. See the roadmap in the architecture
doc.

## License

[The Unlicense](UNLICENSE) — released into the public domain.
