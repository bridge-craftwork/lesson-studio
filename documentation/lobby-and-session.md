# Lobby & Session Model

**Status:** Phases A + B + C implemented (2026-07-27).
A: Lobby, Close, last-location restore, Templates, merged History.
B: File System Access handles persisted in IndexedDB (`src/lesson/handles.ts`),
file-backed drafts tagged `file` in History, Save re-requests permission after a
reload.
C: disk **Favorites** (star a `file` History row; a Favorites section) and a
remembered **lesson-library** folder (`src/lesson/lessonLibrary.ts` scans
`lessons/<slug>/<slug>.md` or a flat `.md` folder, listing slugs; opening reads
the file).
Automated-verified: the IndexedDB layer (files + directories + favorites),
History/favorite tagging and reactivity, and `scanLibrary` (Playwright + vitest,
`lobby.test.ts`). **Still needs a manual pass with real files** — the native
pickers can't be driven headless: Open→remember, Save-in-place after reload,
`isSameEntry` dedup, choosing/granting a library folder and opening a listed
lesson.
**Author:** Rick Wilson
**Date:** 2026-07-22

---

## The problem

The studio always opens *into a document*. Today that's the hardcoded
`STARTER_LESSON` template (which happens to be a New Minor Forcing lesson), so
every load looks like "here is a document you were working on."

Two things are wrong with that:

1. **There is no neutral home.** The app has no state that means "not currently
   editing anything." Template, saved work, and someone else's lesson all
   present identically.
2. **Auto-opening a finished document is the wrong signal.** If you composed a
   lesson and decided it was good to go, having it reappear on next launch
   *"will feel like I didn't finish it"* — the app implies unfinished business
   about work you considered done.

## The model

Two top-level places:

- **Lobby** — the home screen. Not a template, not an open document. Where you
  choose what to work on.
- **Document** — editing one lesson.

And one new verb:

- **Close** — an explicit "I'm done with this." It returns you to the Lobby.
  Closing is the act that marks a document *finished and put away*, as distinct
  from merely navigating away mid-thought.

### Session memory

The app remembers where you were and returns there — but *where you were* can be
the Lobby:

| You left the app… | Next launch opens… |
|---|---|
| Mid-edit, document open | That document, where you left it |
| Having **Closed** the document | The **Lobby** |
| Never opened anything | The **Lobby** |

This is the crux: session restore and "don't resurrect finished work" are only
compatible because **Close** records the intent. Restoring the last *location*
(rather than the last *document*) satisfies both.

## What the Lobby offers

Starting points, not a file browser:

- **Templates** — start a new lesson from a skeleton (the architecture's
  "template starter" plugin belongs here rather than as an implicit default).
- **Favorites** — lessons you return to often.
- **History / Recent** — recently opened lessons and autosaved drafts (today's
  Drafts menu, promoted to a first-class surface).
- **Open…** — pick a `.md` from disk (e.g. a `lesson-library` checkout).

## Related gaps this should absorb

Found while reviewing the current UI; several disappear once a Lobby exists:

- **Drafts are invisible.** Work autosaves to `localStorage`, but nothing
  restores it or signals it exists — it looks like work was lost. The Lobby's
  History makes it visible.
- **The template masquerades as content.** The starter is a realistic NMF
  lesson, indistinguishable from a real document — and there is now also a
  *real* New Minor Forcing lesson in `lesson-library`. Templates should be
  clearly templates.
- **File handles don't survive a reload.** After Open…, a refresh loses the
  File System Access handle, so Save can no longer write back to the same file
  without re-picking it. (Handles can be persisted in IndexedDB.)
- **Drafts accumulate with identical titles** — each session mints a new draft
  id, so editing the template repeatedly yields several "New Minor Forcing"
  entries.

## Open questions

Resolved 2026-07-27 (decisions in **bold**):

1. Is a **Favorite** a file on disk, a draft, or a `lesson-library` lesson by
   slug? (Disk favorites need persisted handles.) → **A file on disk**, via a
   File System Access handle persisted in IndexedDB. (Phase C.)
2. Does **History** merge drafts and opened files into one list, or keep them
   separate? → **One merged list, newest-first**, each entry tagged with its
   `kind`. (Phase A merges drafts; Phase B adds recent files.)
3. Does **Close** prompt to save when the document is dirty, or auto-save the
   draft and close silently? → **Auto-save a draft and close silently.** The
   Lobby's History is the safety net that makes a save prompt unnecessary.
4. Should the Lobby list the `lesson-library` lessons directly (needs directory
   access, or a checked-out path the app remembers)? → **Yes** — remember a
   `lessons/` directory handle (IndexedDB) and list its lessons. (Phase C.)
5. Where does the future **volunteer submit** flow (PR-on-your-behalf, Phase 2)
   appear — a Lobby action, or a Document action? → Still open (Phase 2).

## Implementation notes (Phase A)

- **Location** lives in `src/lesson/sessionStore.ts` (`lesson-studio:session:v1`
  in localStorage): `{ location, draftId?, handleKey?, fileName? }`. `useLessonSession`
  reads it on construction (`restoreLocation`) and writes it on every
  enter-document / Close.
- A document is reconstituted on reload **from its autosave draft** (by
  `draftId`). Entering a document persists the draft up front so restore works
  even before the first edit. A backing file handle can't be serialized here —
  that's Phase B's IndexedDB `handleKey`.
- **Templates** are `src/lesson/templates.ts` (STARTER_LESSON is now the
  "Topic introduction" template, no longer the implicit default). The app boots
  to the Lobby.
- **History** is `src/lesson/history.ts` → `HistoryEntry[]`; Phase A sources
  drafts only, the merge shape is already in place for recent files.
- The old in-document **Drafts** menu is removed — superseded by Lobby History.
