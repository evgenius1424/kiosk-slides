# 04 — Metric component

Status: resolved
Blocked by: 01
Spec: ../spec.md

## What

Add the component as specified under "Component detection/mapping rules" in the spec: *Metric*: `<!-- metric -->` above a bold value line followed by a caption line → `{ value, caption }`. Keep the existing metric visuals. Tests: happy path, plus errors for a missing bold value or a missing caption.

Follow the per-component module + render-component pattern that ticket 01 established, plus the shared annotation helper. Add one slide for this kind to `public/example.md`. Error messages use the `Line N: ...` convention and stay specific.

## Acceptance

- [ ] Parser + typed `Slide` variant + `SlideView` render + CSS (in `app/globals.css`, matching the existing kiosk style)
- [ ] vitest coverage of the happy and unhappy paths listed above
- [ ] `pnpm test` and `pnpm exec tsc --noEmit` are clean; `public/example.md` parses
