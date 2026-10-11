# Spec: presentation settings that stick

Status: ready-for-agent
Blocked by: (none)
Track: A (look and sharing), step 1

## Problem

Five settings only live in page memory in `components/kiosk-workspace.tsx`: background tone (`accent`, line 135), transition (136), screen-share safe (137), and autoplay duration and loop (the Settings inputs at lines 875 and 882 call `setDuration` / `setLoop` but never write the front matter). So:

- A reload resets them.
- Switching presentations carries one presentation's tone and transition over to another.
- The AI can't choose them, and a pasted presentation can't carry them.
- A share link (see `share-link`) would lose them.

Theme, font, scale and brand already live in the front matter through `setFront`, and those settings work correctly.

## Decision

Move all five into the front matter, so the Markdown is the one source of truth for how a presentation looks and plays.

```yaml
---
title: Quarterly review
theme: room-dark
tone: teal # graphite | plum | wine | teal | bronze | #hex
transition: fade # gentle | fade | slide | none
share-safe: true
autoplay:
  duration: 12s
  loop: false
---
```

- When a value is the default, the key is left out, the same way `font` and `brand` work today: Graphite, Gentle, share-safe off, 12s, loop true.
- `tone` takes a name (case-insensitive) or a `#hex`, the same set `skills/render.ts` accepts today. The site's picker offers only the five names. A hex from a pasted file still renders, and the picker then shows no selection.
- Unknown values fail with `Line N:` errors in the existing style ("Unknown tone “x”. Use graphite, plum, wine, teal, bronze or a #hex color.").
- The `S` key toggles screen-share safe for this session only and doesn't write the file. The Settings toggle writes `share-safe`. Rule: keys are temporary, Settings are saved.
- The `P` key works the same way: autoplay on or off is never saved. Only duration and loop are.
- Moving the `autoplay:` block parsing from regex to `field()` is welcome but optional. The `duration: Ns` and `loop:` shapes stay as they are.

## Where it lands

- `lib/presentation/parse.ts` `parseFrontMatter`, `look.ts` (`PresentationLook` gains `tone`, `transition`, `shareSafe`), `theme.ts` tones lookup.
- `components/kiosk-workspace.tsx`: replace the `accent`, `transition`, `safe`, `duration` and `loop` state with values read from the parsed presentation, and setters that call `setFront`.
- `components/slide/presentation-html.tsx` and `skills/render.ts`: read these from the presentation. The CLI flags `--tone`, `--transition`, `--share-safe` and `--no-motion` stay as overrides.
- `FORMAT.md` front matter section and `public/example.md`, which is the format's own example. Then `pnpm build:skills` and commit the output.
- AI prompt: FORMAT.md mentions `tone` as optional and lets the AI pick one when the talk suggests it. Transition and share-safe stay for people to choose.

## Acceptance

- [ ] Changing tone, transition, share-safe, duration or loop in Settings survives a reload, and differs per presentation.
- [ ] A presentation with `tone: wine` pasted into Edit shows Wine in the preview, the download and the skill render.
- [ ] Defaults never add keys, so the starter presentation's front matter is unchanged.
- [ ] Parser tests cover each new key, valid and invalid; the parity test still passes (site download = skill render).
- [ ] `pnpm check`, `pnpm build` and `pnpm build:skills` are clean, and the regenerated skill files are committed.

## Out of scope

Saving the autoplay on/off state or the slide position (the slide position is `presenting-basics`).
