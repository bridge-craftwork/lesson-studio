# Bridge-block node views (next up)

Milkdown/ProseMirror node-view plugins that render each reserved DSL block
(Contract 1) as a live Vue component using the Contract 2 bridge components.

One plugin per active v1 block — `hand`, `hands`, `auction`, `response-box`,
`quiz` — each responsible for:

1. A remark/ProseMirror node spec for the fenced tag, so the block parses from
   markdown and **serializes back byte-identically** (the round-trip
   requirement; enforce the per-block canonical form here).
2. A Vue node view: parse the block body → adapt to component props
   (`src/dsl` adapters) → render the `@bridge-craftwork/bridge-components`
   component, with an editing affordance.

Registered in `src/editor/MilkdownEditor.vue` via `.use(...)` as each lands.
