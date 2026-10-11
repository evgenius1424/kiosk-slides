# Spec: PDF handout

Status: ready-for-agent
Blocked by: (none)
Track: C (independent)

## Problem

After a meeting people ask for "the slides". A PDF is what email, chat apps and document systems accept everywhere; an HTML file often isn't.

## Decision

Use the browser's own print-to-PDF. No PDF library and no server: text stays sharp and selectable.

- **Print styles in the shared renderer** (`lib/slide-styles.ts` / `presentation-html.tsx`):
  - `@page { size: 16in 9in; margin: 0 }`.
  - Every slide prints, one per page, with `print-color-adjust: exact` so dark backgrounds print.
  - Controls and notices are hidden.
  - Transitions are off.
  - Container-query sizing keeps working, because the page width is fixed.
- **Downloaded file:** Ctrl/⌘ P on it gives the same PDF.
- **Site:** Download becomes a small menu with **Web page** (today's file) and **PDF**. PDF renders the same HTML into a hidden iframe and calls `print()`. The toast says "Choose Save as PDF in the print dialog".
- **Skill:** `SKILL.md` notes that printing the HTML gives a PDF. No headless-browser dependency.
- Charts, flows, code and images must not split across pages, and each slide fills its page edge to edge.

## Acceptance

- [ ] In Chrome, Safari and Firefox, Download, PDF, Save as PDF gives one 16:9 page per slide in the chosen theme, tone and font.
- [ ] Text in the PDF is selectable.
- [ ] Printing a downloaded file gives the same result.
- [ ] The parity test still passes. Add a test that the print CSS is present in the export.

## Out of scope

Handouts with several slides per page.
