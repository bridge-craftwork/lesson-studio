# Copied-in bridge components (Phase 1)

Per Contract 2's consumption model, Phase 1 proves the Bridge-Classroom
rendering components **copied in** to the consumer before they are extracted to
`@bridge-craftwork/bridge-components`. This directory is where the copies live,
and `vite.config.ts` aliases the package name here.

- `HandDisplay`, `AuctionTable` — copy from Bridge-Classroom `src/components/`
  once decoupled from the app's stores/router/API (they already are).
- `HandsCompass`, `ResponseBox`, `QuizSnapshot` — new components to build
  (Contract 2 build-status table).

The placeholders here render the Contract 2 prop shapes so the editor node
views and print view have a rendering target during Phase 1. Replace them with
the real components, then (Phase 2) switch the Vite alias to a sibling
Bridge-Classroom checkout via `BRIDGE_COMPONENTS_SRC`.
