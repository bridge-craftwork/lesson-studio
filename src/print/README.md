# Print view (Phase 1)

The same Contract 2 components under a print stylesheet (CSS multi-column for
the newsletter layout — architecture doc Open Question 4 leans multi-column by
default), rendered to PDF via Playwright. Output feeds the `pdf-handouts`
pipeline for page chrome (headers, footers, page numbers, dates).

To build:

- A print route/entry that renders a parsed lesson read-only with the print
  stylesheet and the package's print tokens (`break-inside: avoid` on every
  block, per Contract 2).
- A Playwright script that loads the print route and emits PDF.
- The pdf-handouts hand-off.
