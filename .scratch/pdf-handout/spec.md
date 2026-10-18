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
- **Downloaded file:** Ctrl/⌘ P on it in a desktop browser gives a PDF with selectable text. Printing uses a flat background, since the gradient prints badly.
- **Site:** Download becomes a small menu with **Web page** (today's file) and **PDF**. PDF draws each slide of the same HTML onto a canvas at 5120×2880 (the largest 16:9 canvas iPhones allow is about 16.7 million pixels) and writes the images into a 16:9 PDF in the browser, so phones get landscape pages too. iOS printing ignores `@page` size and mangles the background gradient, which ruled out `print()` for the site. The trade-off: text in the site's PDF is a sharp image, not selectable.
- **Skill:** `SKILL.md` notes that printing the HTML gives a PDF. No headless-browser dependency.
- Charts, flows, code and images must not split across pages, and each slide fills its page edge to edge.

## Acceptance

- [ ] In Chrome, Safari and Firefox, Download, PDF, Save as PDF gives one 16:9 page per slide in the chosen theme, tone and font.
- [ ] Text in the PDF is selectable.
- [ ] Printing a downloaded file gives the same result.
- [ ] The parity test still passes. Add a test that the print CSS is present in the export.

## Out of scope

Handouts with several slides per page.
