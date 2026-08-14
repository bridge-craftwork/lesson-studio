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
     All specified in Contract 2 and **pending upstream**.
  7. `AuctionTable.vue` gains a **`touch`** prop (default `true`, unchanged
     behaviour). `false` condenses the rows: the default 10px padding and 36px
     min-height are touch targets that land a row at ~2.5x the type size, where
     reading material wants ~1.5x. Deliberately **not** folded into `columns`,
     which is a different axis — a four-column auction inside a lesson is
     reading material too, and wants the same rows. lesson-studio asserts
     `:touch="false"` on its render path and never surfaces it to authors.
  5. `HandDisplay.vue` gives the `.hcp` label a **legibility floor**,
     `max(0.68em, calc(12px * var(--table-scale)))`. The cards scale down
     gracefully from 24px; this label starts at 12px and lands near 7px at the
     0.62 scale a printed lesson uses. The floor is in `em` rather than px so
     it still tracks the host document's text size — a px floor pinned the
     label while everything around it grew. **Pending upstream** — small text
     wants a floor, not only a proportional size, which is a general concern
     rather than a lesson-studio one.
  8. `HandDisplay.vue` gains a **`fragment`** prop (default `null` = unchanged
     behaviour). It overrides the internal `isPartialHand` heuristic, which
     calls a hand a fragment only below **5 cards** — far too low for teaching
     material, where a suit combination (`A K Q x x` opposite `x x x`) is
     exactly the thing you want shown as bare suit rows. Above the threshold
     those rendered as whole hands with three empty rows. lesson-studio derives
     the flag in `BlockView` from the suits the author actually named, which the
     component can't see — a void and an unnamed suit both arrive as an empty
     array. **Pending upstream** (specified in Contract 2).
  9. `HandDisplay.vue` keys its rank `v-for`s (visible row + probe) by **index
     instead of by card**. A holding may repeat the small-card placeholder
     (`AKQxx`), and duplicate keys make Vue warn and patch unreliably. Safe
     here: the list is re-derived whole from `hand`, never spliced in place.
     **Pending upstream** — a plain bug once `x` is in the vocabulary.
  10. `HandDisplay.vue`'s `measure()` **resets `--suit-scale` to 1 before it
     reads any rect**, so the fit is never computed through a compression the
     component applied itself. `available` comes from the row's own box, so
     wherever an ancestor is sized by its content — a grid cell on an `auto`
     track, an inline-block, a hugging flex item — compressing narrows that
     ancestor, the ResizeObserver re-fires, and the next measurement reads the
     smaller width. The scale ratchets down and the hand disappears: measured at
     1 → 0.60 → 0.22 → 0 in the `hands` compass, where each seat sits in an auto
     track. `computeFit`'s own comment records this loop being closed for the
     *truncation* path (`allowTruncate: false`); the compression path kept it.
     Resetting makes `available` mean "the width this row has at natural size",
     which a content-sized ancestor reports as the natural width (nothing
     compresses) and a genuinely constrained one reports as its real constraint
     (compresses to a fixed point). **Pending upstream** — a plain bug, and the
     cardplay app's own layouts can hit it wherever a hand sits in a
     shrink-to-fit box.
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
