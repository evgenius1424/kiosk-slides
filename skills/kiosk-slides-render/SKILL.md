---
name: kiosk-slides-render
description: Render a Kiosk Slides Markdown presentation into one self-contained HTML file that presents anywhere, offline, with the room-dark or room-light theme and a background tone. Use when the user wants a presentation (or deck) exported, previewed, re-themed, or turned into HTML.
---

# Kiosk Slides render

`scripts/render.mjs` turns a presentation into the same HTML the Kiosk Slides site exports: identical slide markup and styles, every image embedded, keyboard and autoplay controls built in, no server or network needed to present it. It needs Node 18 or later and nothing else.

## Workflow

1. Get the presentation as a `.md` file. If the user only has notes or a conversation, write the presentation first with the `kiosk-slides-deck` skill.
2. Render it:

   ```bash
   node scripts/render.mjs slides.md -o slides.html
   ```

   Options:
   - `--theme room-dark|room-light` overrides the presentation's front-matter `theme:`.
   - `--tone graphite|plum|wine|teal|bronze` sets the background tone and the color of highlighted heading words. Any `#hex` color works too. The default is graphite.
   - `--font classic|inter|figtree|bricolage-grotesque|space-grotesk|archivo-expanded` overrides the presentation's `font:`. The chosen font is embedded, so the file still works offline.
   - `--scale normal|large|kiosk` overrides the presentation's `scale:`. `kiosk` makes headings as big as each one allows, for screens read from a distance.
   - `--brand <text>` replaces the `kiosk.` mark in the corner of every slide; `--brand none` hides it.
   - `--images <dir>` is the folder that `/images/…` paths resolve against. The default is the presentation's own folder, so `/images/logo.png` is read from `<presentation folder>/images/logo.png`.
   - `--transition gentle|fade|slide|none` picks the slide transition. The default, `gentle`, is a soft rise and fade. `none` cuts instantly.
   - `--share-safe` starts the presentation in screen-share safe mode: every transition becomes a quick flat fade that stays crisp in Google Meet and on meeting-room TVs. Pressing `S` in the exported presentation toggles it.
   - `--no-motion` is the same as `--transition none`.
   - `--check` only validates and prints the slide list, without writing HTML.

3. If it fails, the message starts with `Line N:` and names the rule. Fix the presentation (see the `kiosk-slides-deck` skill for the format) and run it again. An image error means a URL could not be fetched or a `/images/` file is missing; ask the user for the file or remove that slide's image.
4. Give the user the HTML file and how to present it:
   - Open it in any browser and go full screen (F11, or Ctrl+Cmd+F on a Mac).
   - Arrow keys, Page Up/Down, Space, or the scroll wheel move between slides.
   - P toggles autoplay; any click or manual move pauses it. Durations and looping come from the presentation.

Don't edit the generated HTML by hand. Change the presentation or the options and render again, so the Markdown stays the source of truth.

## Choosing a theme

Use `room-dark` for screens in dim rooms, TVs, and kiosks, and `room-light` for bright rooms and projectors that wash out dark backgrounds. Keep graphite unless the user asks for color or names a brand color; then pass that color with `--tone`. For an unattended screen or a big room, pass `--scale kiosk`.
