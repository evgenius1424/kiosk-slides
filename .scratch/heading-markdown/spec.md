# Spec: standard markdown in slide headings

Status: decided 2026-10-11. Follow-up to `.scratch/markdown-format-rework/spec.md`.

## Problem

Headings highlight a phrase with `==text==`. That isn't markdown: remark keeps it as literal text, and every
markdown preview shows the `==` marks, so the author can't see the intention while editing.

## Decision

- `**text**` (strong) is the highlight: accent colour, heavy weight. One heading can have several.
- Headings also support `*italic*`, `` `code` `` and `[links](https://...)`, so the slide matches the preview.
  Links must be `https://` (the buttons rule) and open in a new tab.
- Any other inline markdown in a heading is an error that names what is supported (images, `~~strike~~`, HTML).
- Highlights stay heading-only. Body text is unchanged.
- Big-bang swap: `==` gets no special handling (it's plain text). Docs, the example deck, the "Add a slide"
  template and tests move to `**`. It's a local app, so no compatibility period.
- The 115-character cap counts visible text, not markup.

## Shape

`Slide.heading` becomes `HeadingPart[]`, built from the mdast heading's children:

```ts
type HeadingPart = { text: string; highlight?: true; italic?: true; code?: true; url?: string }
```

## Acceptance

- `parseDeck` returns heading parts for strong, emphasis, inline code, links, and nested combinations.
- Non-https heading links and unsupported inline nodes fail with `Line N:` errors.
- `SlideView` renders `strong`, `em`, `code` and `a` inside `h2`.
- `FORMAT.md` rule 2 and all examples use the new syntax; the FORMAT.md example test still passes.
