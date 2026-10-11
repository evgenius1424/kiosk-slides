# 07 — FORMAT.md, final example.md, chat FORMAT_GUIDE, regression test

Status: ready-for-agent
Blocked by: 02, 03, 04, 05, 06
Spec: ../spec.md

## What

- Write `FORMAT.md` at the repo root as the canonical spec: grammar, the uniform annotation convention, a full component table with detection rules and caps, and example snippets. It must match what `parseDeck` actually enforces; read the parser and its tests.
- Polish `public/example.md` so it demonstrates every kind at least once (message, steps, code, image, table, before-after, chart, metric, flow, buttons).
- Rewrite `FORMAT_GUIDE` in `app/api/chat/route.ts` for the new grammar, in lockstep with `FORMAT.md` (building it from `FORMAT.md` at runtime is fine and preferred if simple). Leave the `extractDeck` retry behavior unchanged.
- Add a regression test: `parseDeck(public/example.md)` succeeds and contains at least one slide of each kind.
- Make sure no `:::` syntax remains anywhere (parser, docs, prompt, example).

## Acceptance

- [ ] `FORMAT.md` exists and agrees with the parser
- [ ] The regression test passes; `pnpm test` and `pnpm exec tsc --noEmit` are clean
- [ ] `grep -rn ':::' app components lib public FORMAT.md` finds nothing
