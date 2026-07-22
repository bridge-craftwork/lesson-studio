# Vendored Bridge-Classroom components (snapshot)

A **snapshot copy** of the real Bridge-Classroom rendering components — the
Contract 2 components that exist today (`HandDisplay`, `AuctionTable`) plus their
self-contained dependency closure. Copied rather than referenced so the
concurrent Bridge-Classroom refactor can't destabilize lesson-studio (see the
`component-delivery` project memory).

- **Source:** `bridge-craftwork/Bridge-Classroom` @ `72a0b50`
  (`src/components/`, `src/utils/`), 2026-07-11.
- **Closure:** `HandDisplay.vue`, `CardSelectorPopup.vue`, `AuctionTable.vue`,
  `handMetrics.js`, `auctionMetrics.js`, `cardFormatting.js`, `handFit.js`.
  Verified clean of app coupling (no stores/router/api/env imports).
- **Edits to the snapshot** (re-apply after any re-copy; both marked in-file
  with `LESSON-STUDIO DELTA`):
  1. `AuctionTable.vue` imports `getSeatOrder` from the small local
     `utils/seatOrder.js` instead of the 753-line `pbnParser.js` (the sole
     symbol it needed).
  2. `AuctionTable.vue` renders a **footnote superscript** on a bid when its
     `meanings` entry carries a `note` number. Lessons key numbered footnotes
     to specific calls, and the upstream component surfaces meanings only as
     hover tooltips — which don't print. **Pending upstream** as an additive
     prop (see Contract 2, "lesson-studio as a first-class consumer").

  Everything else is byte-for-byte upstream.

**Do not hand-edit these files.** To update, re-copy from Bridge-Classroom and
re-apply the one `seatOrder` import change. The components not present upstream
(`HandsCompass`, `ResponseBox`, `QuizSnapshot`) remain lesson-studio
placeholders in the parent directory until they're built in the package.
