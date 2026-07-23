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
  3. `AuctionTable.vue` renders a **`!` alert marker** on a bid whose `meanings`
     entry sets `isAlert`. The prop shape already documents `isAlert` upstream;
     nothing rendered it. Shares the superscript slot with the footnote number.
  4. `AuctionTable.vue` gains the **`columns` / `labels` / `grid`** display
     props — the two-column uncontested form used by nearly all printed
     teaching material, explicit header labels, and an unruled variant. The
     component derives the active pair from `bids` + `dealer` and silently
     falls back to the four-column grid when the auction is competitive.
     Two consequences worth knowing when re-applying:
     - the two-column form is **exempt from `dense`**. Dense answers "four
       columns won't fit a console tile"; a two-column table is legitimately
       half-width and would false-positive, shrinking its bids.
     - it **shrink-wraps and centres** rather than filling its container. The
       min-width floor exists to align a four-column auction with the
       BiddingBox beneath it, which this layout never sits above; stretched
       across a print column the two bids land far apart and stop reading as
       one auction.
     - its rows are **tightened**: the four-column grid's 10px padding and 36px
       min-height are touch-target sizing for the student app and land a row at
       ~2.5x the type size. Printed auction tables sit near 1.5x, so the
       two-column form trims padding, drops the floor and overrides the
       inherited body line-height.
     All specified in Contract 2 and **pending upstream**.
  5. `HandDisplay.vue` gives the `.hcp` label a **legibility floor**,
     `max(0.68em, calc(12px * var(--table-scale)))`. The cards scale down
     gracefully from 24px; this label starts at 12px and lands near 7px at the
     0.62 scale a printed lesson uses. The floor is in `em` rather than px so
     it still tracks the host document's text size — a px floor pinned the
     label while everything around it grew. **Pending upstream** — small text
     wants a floor, not only a proportional size, which is a general concern
     rather than a lesson-studio one.
  6. `HandDisplay.vue`'s `.suit-row` takes its family from
     `var(--hand-font, …)` instead of hardcoding `'Segoe UI', system-ui`.
     Hardcoding a family overrides the host document's typography: in
     lesson-studio the card ranks alone fell back to the system font and
     embedded as Type 3 subsets in every printed PDF. The default is unchanged,
     so upstream renders identically. **Pending upstream** as a real prop.

  Everything else is byte-for-byte upstream.

**Do not hand-edit these files.** To update, re-copy from Bridge-Classroom and
re-apply the one `seatOrder` import change. The components not present upstream
(`HandsCompass`, `ResponseBox`, `QuizSnapshot`) remain lesson-studio
placeholders in the parent directory until they're built in the package.
