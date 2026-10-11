# 01 — Foundation: vitest, remark-based parseDeck, typed Slide union

Status: resolved
Blocked by: (none)
Spec: ../spec.md

## What

Replace the regex parser in `lib/deck.ts` with a `remark` + `remark-gfm` (mdast) walker, keeping `parseDeck(source): Deck` and its `Line N: ...` error contract exactly. Move `Slide` to a discriminated union on `kind`. Drop all `:::` directive support.

This ticket covers only: deck front matter, the `---` slide separator, the per-slide chrome HTML comment (spec: "Slide chrome config"), the heading/`==highlight==`/body rules, the one-widget-per-slide rule, and the **message, steps, code, image** kinds (including the new "nested steps list is an error" rule).

**Structure it so later tickets can add components in parallel with few merge conflicts.** Put each component's detection/validation in its own module (e.g. `lib/deck/components/<kind>.ts`) behind a small shared interface, and parse the generic `<!-- type -->` / `<!-- type: k=v k=v -->` annotation grammar in one shared helper. An annotation with an unknown type, or one that isn't followed by a block, is an error. Do the same for render branches in `components/slide.tsx` (one component per kind, e.g. `components/slide/<kind>.tsx`). Tickets 02–06 each add one module.

Set up `vitest` (with `pnpm test`), plus React Testing Library + jsdom for `SlideView` tests (spec: Testing Decisions).

Keep the app booting. `app/page.tsx` parses `public/example.md` on load, so rewrite `public/example.md` minimally in the new grammar using only the kinds this ticket supports. Tickets 02–06 each add a slide for their kind.

## Acceptance

- [ ] `pnpm test` runs vitest; tests cover front matter, the chrome comment, message/steps/code/image happy paths, and the error paths (no heading, >1 widget, nested steps, code >12 lines, bad image src, unclosed highlight, unknown annotation)
- [ ] `Slide` is a discriminated union; there are no `values`/`items` bags left; `SlideView` renders steps/code/image the same way it does today
- [ ] `pnpm exec tsc --noEmit` is clean, and `public/example.md` parses
