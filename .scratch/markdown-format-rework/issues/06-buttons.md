# 06 — Buttons component

Status: resolved
Blocked by: 01
Spec: ../spec.md

## What

Add the component as specified under "Component detection/mapping rules" in the spec: _Buttons_: `<!-- buttons -->` above a bullet list of `[Label](https://...)` links → `buttons: {label,url}[]`. At most 3, `https://` only, and a bullet that isn't a link is an error. Render as link buttons (target=_blank, rel=noopener). Tests: happy path, >3 is an error, a non-https URL is an error. Add an RTL test asserting button count and hrefs.

Follow the per-component module + render-component pattern that ticket 01 established, plus the shared annotation helper. Add one slide for this kind to `public/example.md`. Error messages use the `Line N: ...` convention and stay specific.

## Acceptance

- [ ] Parser + typed `Slide` variant + `SlideView` render + CSS (in `app/globals.css`, matching the existing kiosk style)
- [ ] vitest coverage of the happy and unhappy paths listed above
- [ ] `pnpm test` and `pnpm exec tsc --noEmit` are clean; `public/example.md` parses
