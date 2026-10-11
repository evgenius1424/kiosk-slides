# 02 — Table + Before/After component

Status: resolved
Blocked by: 01
Spec: ../spec.md

## What

Add the component as specified under "Component detection/mapping rules" in the spec: *Table* and *Before/After*. Render the table (header + rows) and keep the before/after visuals as they are today. Tests: table happy path, the 5×6 cap, case-insensitive `Before | After` detection, a before/after with extra rows is an error. Add an RTL test asserting the table's row/column counts.

Follow the per-component module + render-component pattern that ticket 01 established, plus the shared annotation helper. Add one slide for this kind to `public/example.md`. Error messages use the `Line N: ...` convention and stay specific.

## Acceptance

- [ ] Parser + typed `Slide` variant + `SlideView` render + CSS (in `app/globals.css`, matching the existing kiosk style)
- [ ] vitest coverage of the happy and unhappy paths listed above
- [ ] `pnpm test` and `pnpm exec tsc --noEmit` are clean; `public/example.md` parses
