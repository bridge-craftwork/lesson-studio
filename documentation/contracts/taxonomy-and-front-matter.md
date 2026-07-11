# Contract 4: Taxonomy JSON + Front-Matter Schema

**Status:** Draft for review
**Owners:** Bridge-Classroom (taxonomy JSON) and lesson-studio (front-matter
schema) — jointly versioned here.
**Consumers:** lesson-library CI lint, lesson-studio front-matter validation,
Hand Curator pulldowns, convention-card → skill-path mapping.
**Schema version:** taxonomy `1` (`schema: "taxonomy/v1"`), front matter `1`.
**Date:** 2026-07-11

---

## Purpose

Two coupled artifacts that let lessons be tagged with skill paths and validated
against a single canonical vocabulary:

- **Part A — Taxonomy JSON** (Bridge-Classroom): the canonical, versioned,
  machine-readable list of valid skill paths.
- **Part B — Front-matter schema** (lesson-studio): the YAML header each lesson
  carries, whose `skill_paths` are validated against Part A.

The point of the contract is to **end private transcription drift**: today the
skill-path vocabulary is hand-maintained in at least two places inside
Bridge-Classroom — `src/utils/bakerBridgeTaxonomy.js` (the master catalog) and
`documentation/CARD_TAXONOMY_MAPPING.md` / `src/utils/cardToTaxonomyMapping.js`
(the convention-card → skill-path mapping) — plus prose copies in other docs.
Contract 4 makes one `taxonomy.json` the source of truth; the JS catalog, the
card mapping, and lesson lint all derive from or validate against it.

## Part A: Taxonomy JSON

### Shape

One JSON document: a versioned header plus a flat array of skill-path entries.
Grounded in the existing `BAKER_BRIDGE_TAXONOMY` catalog (44 paths across 7
categories at time of writing).

```json
{
  "schema": "taxonomy/v1",
  "version": "1.0.0",
  "generated": "2026-07-11",
  "categories": [
    { "id": "basic_bidding",        "name": "Basic Bidding" },
    { "id": "bidding_conventions",  "name": "Bidding Conventions" },
    { "id": "competitive_bidding",  "name": "Competitive Bidding" },
    { "id": "partnership_bidding",  "name": "Partnership Bidding" },
    { "id": "declarer_play",        "name": "Declarer Play" },
    { "id": "defense",              "name": "Defense" }
  ],
  "paths": [
    { "path": "bidding_conventions/new_minor_forcing",
      "name": "New Minor Forcing", "category": "bidding_conventions",
      "level": "intermediate" },
    { "path": "basic_bidding/major_suit_openings",
      "name": "Major Suit Openings", "category": "basic_bidding",
      "level": "basic" }
  ]
}
```

### Fields

Header:

| Field | Req | Type | Notes |
|---|---|---|---|
| `schema` | ✓ | const `"taxonomy/v1"` | Format + format-version tag. |
| `version` | ✓ | string (semver) | Content version — bumped on every change (see Versioning). Distinct from `schema`. |
| `generated` | ✓ | string (date) | ISO 8601 date this file was produced. |
| `categories` | ✓ | array | Category id → display name; the set of legal `path` prefixes. |
| `paths` | ✓ | array | The canonical skill paths. |

Category entry: `id` (snake_case, the prefix before the first `/` in a path)
and `name` (display).

Path entry:

| Field | Req | Type | Notes |
|---|---|---|---|
| `path` | ✓ | string | `category/leaf`, snake_case, unique. The token lessons tag with. |
| `name` | ✓ | string | Human-readable display name. |
| `category` | ✓ | string | Must equal the `path` prefix and be a declared category `id`. |
| `level` | ✓ | enum | `basic` \| `intermediate` \| `advanced` \| `expert`. |

`path.category` and the `category/` prefix are redundant **by design** — lint
enforces they agree, catching typos in either.

**Not in the shared contract:** Baker-Bridge practice-content provenance
(`pbn`, `dealCount`) stays in the Bridge-Classroom-internal `BAKER_BRIDGE_TAXONOMY`
catalog. The published `taxonomy.json` is the *vocabulary* only; the internal
catalog may be a superset that also carries those fields, but consumers of the
contract MUST NOT depend on them.

### Publication

Bridge-Classroom publishes `taxonomy.json` versioned — naturally alongside or
inside the `@bridge-craftwork/bridge-components` package (Contract 2), so a
lesson-studio checkout that pins the component version pins a matching taxonomy.
The internal `bakerBridgeTaxonomy.js` catalog and `cardToTaxonomyMapping.js` are
migrated to import/derive from this file so the drift is closed at the source
(Phase 2 in the architecture doc).

### JSON Schema (draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://bridge-craftwork.github.io/contracts/taxonomy-v1.json",
  "title": "Skill-Path Taxonomy (taxonomy/v1)",
  "type": "object",
  "required": ["schema", "version", "generated", "categories", "paths"],
  "additionalProperties": false,
  "properties": {
    "schema": { "const": "taxonomy/v1" },
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "generated": { "type": "string", "format": "date" },
    "categories": {
      "type": "array", "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "name"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string", "pattern": "^[a-z][a-z_]*$" },
          "name": { "type": "string", "minLength": 1 }
        }
      }
    },
    "paths": {
      "type": "array", "minItems": 1,
      "items": {
        "type": "object",
        "required": ["path", "name", "category", "level"],
        "additionalProperties": false,
        "properties": {
          "path": { "type": "string", "pattern": "^[a-z][a-z_]*/[a-z][a-z_0-9]*$" },
          "name": { "type": "string", "minLength": 1 },
          "category": { "type": "string", "pattern": "^[a-z][a-z_]*$" },
          "level": { "enum": ["basic", "intermediate", "advanced", "expert"] }
        }
      }
    }
  }
}
```

Structural validity is necessary but not sufficient; a consistency lint also
enforces: every `path.category` is a declared category `id`; the `category/`
prefix equals `category`; `path` values are unique.

### Versioning (the taxonomy-versioning process)

This is the process Open Question 1 in the architecture doc calls the "first
test." `version` is semver over **content**:

- **PATCH** — display-name/`level` correction, no path added or removed.
- **MINOR** — a path (or category) **added**. Backward compatible: existing
  lesson tags still resolve. This is the common case (e.g. a lesson needs a
  convention not yet catalogued).
- **MAJOR** — a path **removed or renamed**, or a category restructured.
  Breaking: some lesson tags may no longer resolve. Requires an ADR-style
  review and a migration note mapping old paths → new, so lesson-library can be
  swept.

Process for an addition: open a PR against `taxonomy.json` adding the entry,
bump `version` (MINOR), review, merge, publish. Consumers pick it up on their
next pin bump. Renames never silently drop a path — they go MAJOR with a
mapping.

**Q1 resolved with data:** `bidding_conventions/new_minor_forcing` already
exists in the catalog (`src/utils/bakerBridgeTaxonomy.js`), so the New Minor
Forcing seed lesson is *not* an addition — the first real exercise of this
process is simply extracting the existing catalog into `taxonomy.json`, not
adding a path.

## Part B: Front-matter schema

The YAML header of every lesson. Authoritative here; the DSL grammar
(Contract 1) references this schema.

| Field | Req | Type | Notes |
|---|---|---|---|
| `title` | ✓ | string | Lesson title. |
| `skill_paths` | ✓ | string[] | ≥1 path; **every entry must exist in the current `taxonomy.json`.** A Lessons 1–6 summary legitimately spans many `basic_bidding/*` paths. |
| `primary` | – | string | The best-single-doc path for remediation lookup; **must be one of `skill_paths`.** |
| `level` | ✓ | enum | `basic` \| `intermediate` \| `advanced` \| `expert` — same vocabulary as taxonomy `level`. |
| `author` | ✓ | string | |
| `status` | ✓ | enum | `draft` \| `published`. Merge to `main` with `published` = live. |
| `reviewed-by` | ✓ | string | Reviewer name, or `self` for maintainer direct-push under branch-protection bypass. |

```yaml
---
title: New Minor Forcing
skill_paths:
  - bidding_conventions/new_minor_forcing
primary: bidding_conventions/new_minor_forcing
level: intermediate
author: Rick Wilson
status: published
reviewed-by: self
---
```

### Front-matter validation (CI lint)

1. All required fields present; enums in range.
2. Every `skill_paths` entry resolves against the pinned `taxonomy.json`
   (typos cannot silently fragment the remediation linkage).
3. `primary`, if present, is a member of `skill_paths`.
4. A `published` lesson has a non-empty `reviewed-by`.

### Reconciliation note

The lesson `level` vocabulary is deliberately aligned to the taxonomy `level`
vocabulary (`basic|intermediate|advanced|expert`). An earlier DSL draft used
`beginner|intermediate|advanced`; this contract supersedes that — the DSL doc
is updated to match, so a lesson's level and its skill paths' levels speak the
same language.

## Evolution rules

- Taxonomy content changes follow the semver process above.
- Front-matter **additive** changes (new optional field) are minor; a new
  required field or a changed enum is breaking and needs a lesson-library sweep.
- The `level` enum is shared between Parts A and B; changing it is a
  cross-part change reviewed here.

## Open items for review

1. **`level` on lessons vs. paths.** A lesson tags several paths of differing
   levels; its own `level` is author-declared, not derived. Confirm that's the
   intended semantics (lesson difficulty ≠ max of its paths' levels).
2. **Category set.** The published taxonomy currently would carry 6 pedagogical
   categories; the internal catalog also contains `practice_deals`, which is
   content-provenance, not a skill category. Confirm `practice_deals` is
   excluded from the published vocabulary.
3. **Where `taxonomy.json` ships.** Alongside vs. inside the component package.
   Decide with the Contract 2 packaging so the pin story is single-versioned.
4. **Card mapping ownership.** `cardToTaxonomyMapping.js` (card path →
   skill_paths) is a *separate* artifact that consumes this taxonomy for
   convention-card discovery (Phase 3). It is out of scope for Contract 4's
   schema but must be migrated to validate its `skill_paths` against the same
   file.
