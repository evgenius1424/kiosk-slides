# 03 — Chart component

Status: resolved
Blocked by: 01
Spec: ../spec.md

## What

Add the component as specified under "Component detection/mapping rules" in the spec: _Chart_: `<!-- chart: type=bar|line x= y= -->` above a GFM table. Small hand-rolled inline SVG renderer for bar and line, ≤6 points and ≤5 series, with no charting dependency unless that proves awkward. Tests: default x/y (first column = labels), explicit x/y, a missing or invalid type is an error, the cap, a chart annotation without a table is an error. Add an RTL test asserting bar/point count.

Follow the per-component module + render-component pattern that ticket 01 established, plus the shared annotation helper. Add one slide for this kind to `public/example.md`. Error messages use the `Line N: ...` convention and stay specific.

## Acceptance

- [ ] Parser + typed `Slide` variant + `SlideView` render + CSS (in `app/globals.css`, matching the existing kiosk style)
- [ ] vitest coverage of the happy and unhappy paths listed above
- [ ] `pnpm test` and `pnpm exec tsc --noEmit` are clean; `public/example.md` parses
