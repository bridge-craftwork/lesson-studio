# Lobby & Session Model

**Status:** Captured — not implemented
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

1. Is a **Favorite** a file on disk, a draft, or a `lesson-library` lesson by
   slug? (Disk favorites need persisted handles.)
2. Does **History** merge drafts and opened files into one list, or keep them
   separate?
3. Does **Close** prompt to save when the document is dirty, or auto-save the
   draft and close silently?
4. Should the Lobby list the `lesson-library` lessons directly (needs directory
   access, or a checked-out path the app remembers)?
5. Where does the future **volunteer submit** flow (PR-on-your-behalf, Phase 2)
   appear — a Lobby action, or a Document action?
