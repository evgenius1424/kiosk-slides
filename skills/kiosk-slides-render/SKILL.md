---
name: kiosk-slides-render
description: Render a Kiosk Slides Markdown deck into one self-contained HTML file that presents anywhere, offline, with the room-dark or room-light theme and a background tone. Use when the user wants a deck exported, previewed, re-themed, or turned into HTML.
---

# Kiosk Slides render

`scripts/render.mjs` turns a deck into the same HTML the Kiosk Slides site exports: identical slide markup and styles, every image embedded, keyboard and autoplay controls built in, no server or network needed to present it. It needs Node 18 or later and nothing else.

## Workflow

1. Get the deck as a `.md` file. If the user only has notes or a conversation, write the deck first with the `kiosk-slides-deck` skill.
2. Render it:

   ```bash
   node scripts/render.mjs deck.md -o deck.html
   ```

   Options:
   - `--theme room-dark|room-light` overrides the deck's front-matter `theme:`.
   - `--tone graphite|plum|wine|teal|bronze` sets the background tone and the color of highlighted heading words. Any `#hex` color works too. The default is graphite.
   - `--images <dir>` is the folder that `/images/…` paths resolve against. The default is the deck's own folder, so `/images/logo.png` is read from `<deck folder>/images/logo.png`.
   - `--no-motion` turns off the slide transition, for screen sharing or slow hardware.
   - `--check` only validates and prints the slide list, without writing HTML.

3. If it fails, the message starts with `Line N:` and names the rule. Fix the deck (see the `kiosk-slides-deck` skill for the format) and run it again. An image error means a URL could not be fetched or a `/images/` file is missing; ask the user for the file or remove that slide's image.
4. Give the user the HTML file and how to present it:
   - Open it in any browser and go full screen (F11, or Ctrl+Cmd+F on a Mac).
   - Arrow keys, Page Up/Down, Space, or the scroll wheel move between slides.
   - P toggles autoplay; any click or manual move pauses it. Durations and looping come from the deck.

Don't edit the generated HTML by hand. Change the deck or the options and render again, so the Markdown stays the source of truth.

## Choosing a theme

Use `room-dark` for screens in dim rooms, TVs, and kiosks, and `room-light` for bright rooms and projectors that wash out dark backgrounds. Keep graphite unless the user asks for color or names a brand color; then pass that color with `--tone`.
