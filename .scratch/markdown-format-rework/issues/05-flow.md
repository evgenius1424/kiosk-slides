# 05 — Flow component

Status: resolved
Blocked by: 01
Spec: ../spec.md

## What

Add the component as specified under "Component detection/mapping rules" in the spec: _Flow_: `<!-- flow -->` above a bullet list of `A -> B -> C` chains. Identical box text merges into one node (convergence); bullets sharing no text become independent parallel lines. Cap: 2 bullets × 4 boxes (8 distinct boxes max). Replace the old flow render with a boxes-and-arrows layout. Tests: single chain, a converging pair, a parallel pair, the cap errors. Add an RTL test asserting box/arrow counts.

Follow the per-component module + render-component pattern that ticket 01 established, plus the shared annotation helper. Add one slide for this kind to `public/example.md`. Error messages use the `Line N: ...` convention and stay specific.

## Acceptance

- [ ] Parser + typed `Slide` variant + `SlideView` render + CSS (in `app/globals.css`, matching the existing kiosk style)
- [ ] vitest coverage of the happy and unhappy paths listed above
- [ ] `pnpm test` and `pnpm exec tsc --noEmit` are clean; `public/example.md` parses
