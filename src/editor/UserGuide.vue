<script setup lang="ts">
/**
 * The User Guide — an in-app orientation page for people trying Lesson Studio
 * for the first time. Reached from the Lobby and returns to it. Deliberately NOT
 * a restorable session location: a reload comes back to the Lobby, never here.
 */
defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <div class="guide">
    <div class="guide__inner">
      <header class="guide__head">
        <button class="guide__back" @click="$emit('close')">‹ Back to the Lobby</button>
        <h1 class="guide__title">User Guide</h1>
        <p class="guide__lede">
          Lesson Studio is a tool for writing <strong>one-page bridge lessons</strong> and printing them
          to clean, self-contained PDFs — with live bridge hands, auctions and response boxes.
          It’s under active development; here’s how to get going.
        </p>
        <p class="guide__note">
          Your work is saved <strong>in your browser</strong> (and to disk when you Save). Nothing is
          uploaded to a server. Chrome or Edge give the smoothest Save experience; other browsers
          fall back to download/upload.
        </p>
      </header>

      <nav class="guide__toc">
        <a href="#lobby">The Lobby</a>
        <a href="#writing">Writing a lesson</a>
        <a href="#blocks">Bridge blocks</a>
        <a href="#auctions">Auctions</a>
        <a href="#saving">Saving, drafts &amp; Close</a>
        <a href="#printing">Preview &amp; printing</a>
      </nav>

      <section id="lobby" class="guide__section">
        <h2>The Lobby</h2>
        <p>The Lobby is home base — it opens when you launch the studio and whenever you Close a lesson.</p>
        <ul>
          <li><strong>Start a lesson</strong> — pick a <em>Template</em> (a blank page, or a worked
            convention example), or <em>Open…</em> a lesson <code>.md</code> file from disk.</li>
          <li><strong>Recent</strong> — everything you’ve worked on, newest first. Reopening the same
            file or restarting a template shows one row per document; older autosaves hide behind an
            <em>“N earlier drafts”</em> expander.</li>
          <li><strong>Favorites</strong> — star a file in Recent to pin it here for quick access.</li>
          <li><strong>Lesson library</strong> — point the studio at a
            <code>lesson-library/lessons</code> folder once and it lists those lessons for you.</li>
        </ul>
      </section>

      <section id="writing" class="guide__section">
        <h2>Writing a lesson</h2>
        <p>
          The editor is a normal writing surface: type prose, and use the <strong>ribbon</strong> at the
          top for headings, <strong>bold</strong>, <em>italic</em>, lists and links (markdown shortcuts
          like <code>##</code> and <code>**bold**</code> work too). Undo/redo and cut/paste behave as
          you’d expect.
        </p>
        <ul>
          <li><strong>Title &amp; metadata.</strong> The lesson’s title, author, level and skill paths
            live in the <strong>Metadata</strong> panel below the title — not in the body. Don’t add a
            top-level <code>#</code> heading; the metadata title <em>is</em> the page heading.</li>
          <li><strong>Suit shortcuts.</strong> Type <code>\C \D \H \S</code> (either case) to get
            ♣ ♦ ♥ ♠ as you write. ♥ and ♦ show in red.</li>
        </ul>
      </section>

      <section id="blocks" class="guide__section">
        <h2>Bridge blocks</h2>
        <p>
          Hands, auctions and the like are <strong>blocks</strong> — insert them from the ribbon’s
          <strong>Insert</strong> row (typing a code fence won’t create one). Each inserts a valid
          example you then edit:
        </p>
        <ul>
          <li><strong>Hand</strong> / <strong>Hands</strong> — one or more bridge hands.</li>
          <li><strong>Auction</strong> — a bidding table (see below).</li>
          <li><strong>Response box</strong> — a bid → meaning table.</li>
          <li><strong>Quiz</strong>, <strong>Row</strong> (side-by-side blocks),
            <strong>Page break</strong> and <strong>Column break</strong> for layout.</li>
        </ul>
        <p>
          Hover a block to reveal its <strong>✎ Edit source</strong> and <strong>🗑 Delete</strong>
          buttons. Editing opens the block’s text so you can change the cards or calls; it re-renders
          live as you type.
        </p>
      </section>

      <section id="auctions" class="guide__section">
        <h2>Auctions</h2>
        <ul>
          <li><strong>Annotations.</strong> Mark a call with <code>=1=</code> and add a numbered note
            below the auction (e.g. <code>2D =1=</code> → “New Minor Forcing”). A bare <code>!</code>
            (as in <code>2D!</code>) flags an alert with no note.</li>
          <li><strong>Two-column auctions.</strong> Uncontested auctions can print in two columns
            (the common teaching layout) — a competitive auction falls back to four automatically.</li>
        </ul>
      </section>

      <section id="saving" class="guide__section">
        <h2>Saving, drafts &amp; Close</h2>
        <ul>
          <li><strong>Autosave.</strong> Your work saves to a browser draft continuously — you’ll find
            it in the Lobby’s Recent list even if you never hit Save.</li>
          <li><strong>Save / Save As.</strong> Write the lesson to a <code>.md</code> file on disk.
            After a Save, the studio remembers that file, so later Saves update it in place.</li>
          <li><strong>Close.</strong> The <em>‹ Close</em> button returns you to the Lobby and marks the
            lesson “put away.” It saves a draft first, so nothing is lost.</li>
          <li><strong>Where you left off.</strong> Relaunching reopens the lesson you were editing — or
            the Lobby, if that’s where you Closed to. Finished work doesn’t reappear as if unfinished.</li>
        </ul>
      </section>

      <section id="printing" class="guide__section">
        <h2>Preview &amp; printing to PDF</h2>
        <ul>
          <li><strong>Preview.</strong> The <em>Preview</em> toggle shows the real print layout — actual
            columns and an accurate page count — so you can tell whether the lesson still fits on one
            page. Trim content if it spills.</li>
          <li><strong>Fitting the page.</strong> Metadata options tune the print output: number of
            <code>columns</code>, page <code>margin-top</code>/<code>margin-bottom</code>, and text
            <code>font-size</code> (12pt by default, larger than a typical handout for easier reading).</li>
          <li><strong>Print → PDF.</strong> The <em>Print</em> link opens a print view. The resulting
            PDF carries its own source inside it — the exact lesson file, plus the hands as PBN — so a
            lesson can be recovered from the PDF alone.</li>
        </ul>
      </section>

      <footer class="guide__foot">
        <button class="guide__back guide__back--foot" @click="$emit('close')">‹ Back to the Lobby</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.guide {
  height: 100%;
  overflow-y: auto;
  background: var(--ls-bg);
}
.guide__inner {
  max-width: 46rem;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 4rem;
}
.guide__head {
  margin-bottom: 2rem;
}
.guide__back {
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ls-accent);
  background: none;
  border: none;
  padding: 0;
  margin-bottom: 1.25rem;
  cursor: pointer;
}
.guide__back:hover {
  text-decoration: underline;
}
.guide__title {
  font-size: 1.9rem;
  font-weight: 700;
  margin: 0;
}
.guide__lede {
  margin: 0.75rem 0 0;
  font-size: 1.05rem;
  line-height: 1.5;
}
.guide__note {
  margin: 0.75rem 0 0;
  padding: 0.7rem 0.9rem;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--ls-fg);
  background: var(--ls-panel);
  border: 1px solid var(--ls-border);
  border-radius: 0.5rem;
}

.guide__toc {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.1rem;
  margin-bottom: 2.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--ls-border);
}
.guide__toc a {
  font-size: 0.85rem;
  color: var(--ls-accent);
  text-decoration: none;
}
.guide__toc a:hover {
  text-decoration: underline;
}

.guide__section {
  margin-bottom: 2.25rem;
  scroll-margin-top: 1rem;
}
.guide__section h2 {
  font-size: 1.25rem;
  font-weight: 650;
  margin: 0 0 0.6rem;
}
.guide__section p {
  margin: 0 0 0.7rem;
  line-height: 1.55;
}
.guide__section ul {
  margin: 0 0 0.7rem;
  padding-left: 1.15rem;
}
.guide__section li {
  margin-bottom: 0.45rem;
  line-height: 1.5;
}
.guide code {
  font-family: var(--ls-mono);
  font-size: 0.88em;
  background: var(--ls-panel);
  border: 1px solid var(--ls-border);
  border-radius: 0.25rem;
  padding: 0.05rem 0.3rem;
}
.guide__foot {
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--ls-border);
}
.guide__back--foot {
  margin: 0;
}
</style>
