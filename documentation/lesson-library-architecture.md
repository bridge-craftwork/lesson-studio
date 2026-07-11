# Lesson Library Architecture

**Status:** Draft for review
**Author:** Rick Wilson
**Reviewers:** David Bailey
**Date:** 2026-07-11

---

## Summary

A collaborative library of one-page bridge topic introductions ("PD lessons"),
authored by volunteers in a WYSIWYG editor, rendered with the Bridge Classroom
component library, optionally sourcing deals and quizzes from
Practice-Bidding-Scenarios, and published through a PR-gated review process.
Lessons are tagged with taxonomy skill paths so the platform can surface them
for remediation, convention-card-driven discovery, and curriculum coverage
analysis.

The design spans four repositories connected by four versioned contracts. The
contracts, not the code, are the durable assets: they let repos and
contributors evolve independently.

## Motivation

Existing one-page topic introductions online (Better Bridge "What's Standard?"
and similar) carry implied IP/ownership and cannot be freely reused. Bridge
Composer supports multi-column layouts with hand fragments but cannot embed
arbitrary tables (e.g., a "Responding to Blackwood" box), diagrams with arrows,
or other rich elements. We want:

1. Freely licensed (CC0) one-page topic introductions for our own classes,
   starting with a Lessons 1–6 beginner summary and a New Minor Forcing intro.
2. An authoring tool volunteers can use without touching git or PBN.
3. Content that renders identically in the editor, in print, and on
   bridge-classroom.org, using one component library.
4. Integration with the platform's skill-path taxonomy so lessons become
   part of the remediation and analytics loop, not just class-day paper.

## Goals

- WYSIWYG authoring with live-rendered bridge blocks (hands, auctions,
  quizzes, response boxes).
- Plain-text markdown storage with clean git diffs; equally authorable by
  humans in the editor and by Claude Code directly.
- Single-sourced deals: lesson boards reference deal repositories by stable
  identity; constructed teaching fragments may be inlined.
- Print output flows through the existing pdf-handouts pipeline for headers,
  footers, page numbers, and dates.
- PR-gated volunteer publishing with maintainer bypass for direct authoring.
- Skill-path tagging validated against a canonical machine-readable taxonomy.

## Non-Goals

- Replacing Bridge Composer for full-deal print sheets (bridge-wrangler and
  the PBS build pipeline continue to own that).
- A hosted multi-user editing service with accounts and simultaneous editing.
  Phase 1 is a local/static editor app; the git repo is the collaboration
  substrate.
- Page-precise composition inside the editor. Authors edit single-column
  flow; column layout and fit-to-one-page happen in the print preview.
- Long-form multi-page lesson booklets. The format targets one-page (or
  near-one-page) topic introductions.

## Repository Structure

### 1. `lesson-library` (new)

The content. One directory per lesson containing a markdown+DSL source file
and any lesson-local assets. No application code; CI lint only.

- **License:** CC0. CONTRIBUTING.md carries a one-line contributor statement
  ("all submissions are dedicated to the public domain under CC0") so
  provenance is unambiguous.
- **Publishing model:** merge to `main` = published. Branch protection
  requires PR review with a bypass list (Rick, optionally David) for direct
  authoring. CI lint is a required status check for everyone, including
  bypass users.
- **Front matter** (see Contract 4) carries title, skill paths, author,
  status, and review provenance. Direct pushes stamp `reviewed-by: self` so
  library metadata stays uniform.

### 2. `lesson-studio` (new)

The authoring application and the DSL definition. Owns:

- The **DSL specification** (Contract 1). Grammar and parser are versioned
  together in this repo.
- The **Milkdown editor app**: Vue application embedding Milkdown
  (MIT-licensed, ProseMirror + remark, markdown-native storage). Custom
  fenced-block plugins render bridge blocks as live Vue node views using the
  shared component library.
- The **print view**: the same components under a print stylesheet
  (CSS multi-column for the newsletter layout), rendered to PDF via
  Playwright. Output feeds pdf-handouts for page chrome.
- **Editor plugins:** template starter (pre-loads the one-page topic-intro
  skeleton) and quiz-picker (Phase 2, see below).

### 3. `Bridge-Classroom` (existing)

Contributes two published artifacts:

- **`@bridge-craftwork/bridge-components`** (Contract 2): the Vue hand,
  auction, and quiz rendering components, extracted *in place* into
  `packages/bridge-components/` within this repo — its own `package.json`,
  `vue` as a peer dependency, and no imports from app stores, router, or API
  layers. The Bridge-Classroom app consumes its own components through the
  same boundary. Published to GitHub Packages on tag.

  **Consumption model — live in dev, pinned in CI:** during development,
  lesson-studio Vite-aliases the package name to a sibling Bridge-Classroom
  checkout (`resolve.alias` to `packages/bridge-components/src`, with
  `resolve.dedupe: ['vue']` to prevent duplicate-Vue reactivity bugs), giving
  cross-repo HMR — component edits in Bridge-Classroom hot-reload in
  lesson-studio immediately. CI and release builds install the published
  package at a pinned version so lesson rendering is reproducible;
  Dependabot/Renovate PRs deliver version bumps.
- **Taxonomy JSON** (Contract 4): the canonical machine-readable skill-path
  taxonomy, derived from CARD_TAXONOMY_MAPPING.md and published versioned —
  naturally alongside or inside the component package. Known consumers:
  lesson-library CI lint, Hand Curator pulldowns, convention-card mapping.

The platform also becomes a *consumer* of lesson-library: skill-path tags let
it recommend the relevant one-pager from homework observations (remediation)
and from convention-card settings (discovery).

### 4. `Practice-Bidding-Scenarios` (existing, David)

Deal and quiz source.

- **Deals:** lesson `deal` blocks reference bba-filtered boards by stable
  identity per ADR-0001 and the bilateral deal-repository contract. No PBS
  changes required for this beyond confirming the reference scheme.
- **Quizzes (pipeline enhancement, David's deliverable):** the PBS build
  pipeline, which today generates `quiz/` as Bridge Composer-style PBN,
  additionally emits each quiz as **quiz JSON** (Contract 3) plus a
  `quiz/index.json` manifest. The pipeline is the right conversion point: it
  holds the quizzes in structured form and can stamp provenance (source board
  identity, pipeline version, generation date) at the moment of generation.
  The BC-PBN output remains for direct printing; the BC dialect never
  propagates past PBS build output.

## Contracts

The four contracts are versioned documents. Repos may evolve freely as long as
contracts are honored; contract changes are reviewed like ADRs.

### Contract 1: Lesson DSL grammar

Owned by lesson-studio. Lessons are CommonMark plus fenced code blocks with
reserved language tags. Initial block vocabulary:

| Block | Purpose | Content |
|---|---|---|
| `hand` | Single-hand fragment | Suit-notation hand, optional seat label |
| `hands` | Two- or four-hand fragment | Seats to notation, compass layout |
| `auction` | Bidding table | Dealer, calls in rows, annotations, All Pass handling |
| `deal` | Repository board reference | `repo`, stable board identity, display options (which seats, rotate-south) |
| `quiz` | Embedded quiz snapshot | Quiz JSON per Contract 3, embedded by value |
| `response-box` | Convention response table | Title, bid/meaning rows (e.g., Responding to Blackwood) |

Hand notation, auction formatting conventions (dealer alignment, West-leftmost,
All Pass), and front-matter schema are specified in the DSL doc
([contracts/dsl-grammar.md](contracts/dsl-grammar.md)). Every block must
round-trip losslessly through Milkdown's markdown serialization.

**Reference vs. value:** `deal` blocks reference by identity because
bba-filtered boards are stable under ADR-0001 — edit the deal in the repo and
every referencing lesson updates. `quiz` blocks embed by value because the
`quiz/` folder is a regenerable build artifact whose contents may be
reordered or re-derived; snapshotting keeps lessons immune to pipeline churn,
and embedded provenance keeps staleness detectable by tooling.

### Contract 2: Component package API

Owned by Bridge-Classroom. `@bridge-craftwork/bridge-components` exports the
hand, auction, quiz, and response-box rendering components with documented
props matching the DSL block semantics, plus the print stylesheet tokens.
Consumers: Bridge-Classroom app, lesson-studio editor node views,
lesson-studio print view, future embeddable widgets. Full API — props, the
wire→component adapters, and the extraction/build status — in
[contracts/component-api.md](contracts/component-api.md).

### Contract 3: Quiz JSON schema

Owned jointly, as an addition to the bilateral deal-repository contract
(PBS emits, DSL embeds, components render). Each quiz object carries:

- Quiz content: deal or fragment, question prompt(s), answer/explanation,
  auction context as applicable.
- **Provenance:** source board reference in bba-filtered (stable identity),
  PBS pipeline version, generation date.

The schema must be settled in this document's review **before** David
implements the emitter, so neither side builds against a guess. The full
schema — discriminated union over a shared envelope, `bidding` type defined,
other types reserved — is specified in
[contracts/quiz-json-schema.md](contracts/quiz-json-schema.md).

### Contract 4: Taxonomy JSON + front-matter schema

Owned by Bridge-Classroom (taxonomy) and lesson-studio (front matter). Full
schema in
[contracts/taxonomy-and-front-matter.md](contracts/taxonomy-and-front-matter.md).

Taxonomy: the slash-delimited skill paths (e.g.,
`bidding_conventions/stayman`, `competitive_bidding/lebensohl`) published as
versioned JSON. Additions/renames are versioned changes with known consumers,
ending private transcription drift between systems.

Lesson front matter (YAML):

```yaml
title: New Minor Forcing
skill_paths:
  - bidding_conventions/new_minor_forcing
primary: bidding_conventions/new_minor_forcing
level: intermediate
author: Rick Wilson
status: published
reviewed-by: self
```

`skill_paths` is a list (a Lessons 1–6 summary spans many `basic_bidding/*`
paths); optional `primary` designates the best-single-doc answer for
remediation lookup. CI lint validates every tag against the taxonomy JSON so
volunteer typos cannot silently fragment the linkage.

## Publishing Workflow

1. Author opens lesson-studio, starts from a template, composes with live
   bridge blocks; quiz-picker (Phase 2) browses the PBS quiz manifest and
   embeds selections.
2. Save produces a markdown file. Volunteers submit via PR (Phase 2: a
   Decap-CMS-style submit button that opens the PR on their behalf, mirroring
   the problem-report flow); maintainers push directly under branch-protection
   bypass.
3. CI lint (required for all) validates: DSL parses, hands are legal,
   deal references resolve, quiz JSON validates against schema, skill paths
   exist in taxonomy, front matter complete, page renders.
4. Review and merge to `main` = published. Platform and print tooling consume
   from `main`.
5. Print: lesson-studio print view → Playwright PDF → pdf-handouts adds
   headers, footers, page numbers, dates.

## Roadmap

**Phase 1 — prove the core (Typst-independent, editor-first):**

- DSL spec v1: `hand`, `hands`, `auction`, `response-box`; front-matter
  schema. Deal references stubbed (inline hands only).
- In-place extraction of `packages/bridge-components/` in Bridge-Classroom
  (the store/router/API untangling); lesson-studio consumes via sibling-checkout
  Vite alias with cross-repo HMR.
- Print view + Playwright render + pdf-handouts integration.
- Seed lesson-library with the two real deliverables: Lessons 1–6 beginner
  summary and New Minor Forcing intro. These force the v1 vocabulary.
- Branch protection + bypass + CI lint skeleton.

**Phase 2 — integration:**

- Publish `@bridge-craftwork/bridge-components` to GitHub Packages
  (tag-triggered Action); CI builds switch from the dev alias to pinned
  published versions with Dependabot bumps.
- Publish taxonomy JSON; wire front-matter lint; retrofit Hand Curator
  pulldowns to the same file.
- `deal` block wired to bba-filtered references.
- Quiz JSON schema review with David → PBS pipeline emitter + manifest
  (David) → quiz-picker plugin in lesson-studio (fetch manifest, render with
  shared components, checkbox, embed with provenance).
- Volunteer submit flow (PR-on-your-behalf) modeled on the problem-report
  infrastructure.

**Phase 3 — platform loop:**

- bridge-classroom.org renders published lessons from lesson-library.
- Remediation surfacing: observation skill_path → recommended one-pager.
- Convention-card-driven discovery via the card-path → skill-path mapping.
- Coverage dashboard: taxonomy paths with/without a published intro (the
  volunteer recruiting list).

## Deliverable Ownership

| Deliverable | Owner |
|---|---|
| DSL spec, editor, print view, plugins | Rick (lesson-studio) |
| lesson-library setup, CI lint, seed lessons | Rick |
| Component package extraction, taxonomy JSON | Rick (Bridge-Classroom) |
| Quiz JSON emitter + manifest in PBS build | David |
| Quiz JSON schema | Joint (deal-repository contract addendum) |
| Volunteer review/publishing | David (PRs), Rick (releases) — existing pattern |

## Open Questions

1. Does `bidding_conventions/new_minor_forcing` exist in the current taxonomy,
   or is it an addition? (First test of the taxonomy-versioning process.)
2. Quiz JSON: single schema for all quiz styles the pipeline generates, or a
   `type` discriminator with per-type payloads?
3. Should the editor app be hosted (static site under bridge-classroom.org)
   in Phase 1, or local-only until the volunteer submit flow lands?
4. Column strategy in print view: CSS multi-column vs. explicit column
   containers in the template — decide after the first two lessons expose
   real layout needs.

## Alternatives Considered

- **Typst as the authoring format:** fastest path to beautiful one-pagers and
  trivially extensible, but markup-only — no WYSIWYG for volunteers. Remains
  a possible additional *backend* later; the DSL block vocabulary transfers.
- **TipTap instead of Milkdown:** larger ecosystem, but JSON-native storage
  loses clean git diffs and direct Claude Code authorability. Milkdown's
  markdown-native round-trip is the deciding property for a git-centered,
  agent-assisted workflow.
- **Quiz conversion in the picker (parse BC-PBN client-side):** rejected in
  favor of pipeline-emitted JSON; the pipeline holds quizzes in structured
  form and stamps provenance at the source, while client-side parsing would
  reverse-engineer a print dialect.
- **Bespoke submission/review infrastructure:** rejected for Phase 1; PRs and
  the existing David/Rick review pattern suffice until non-git volunteers
  arrive.
