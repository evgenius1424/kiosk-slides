---
name: kiosk-slides
description: Write a Kiosk Slides presentation in Markdown from a conversation, notes, or a document, and render it to one self-contained HTML file that presents anywhere, offline. Use when the user wants a presentation, slides, a deck, or a kiosk loop made, revised, checked, re-themed, exported, or turned into HTML.
---

# Kiosk Slides

A presentation is one Markdown file, and `scripts/render.mjs` turns it into the same HTML the Kiosk Slides site exports: identical slide markup and styles, every image and font embedded, keyboard and autoplay controls built in, no server or network needed to present it. It needs Node 18 or later and nothing else.

The Markdown is always the source. Don't edit the generated HTML by hand; change the Markdown or the render options and render again.

## Pick the path

- **Write**: the user has notes, a document, a conversation, or only an idea, or wants changes to a presentation. Follow "Write a presentation", which ends with the HTML too.
- **Render**: the user already has a presentation `.md` and wants HTML, a new look, or a check. Go straight to "Render".

## Write a presentation

The full grammar is in `references/FORMAT.md` and a presentation that uses every slide kind is `references/example.md`. Read both before writing the first presentation in a conversation. A parser enforces every rule in FORMAT.md and rejects the whole presentation on the first violation, so follow it exactly.

1. Find out what the presentation is for: the audience, the one thing they should remember, and where it plays (a room, a call, an unattended screen). If the user already said, don't ask again. If a detail is missing and a sensible default exists, use the default and say which.
2. Outline before writing: one idea per slide, 5–12 slides, a closing slide that restates the message.
3. Pick a widget for each slide from what its content is, using the table in "Writing a good presentation" in FORMAT.md. Keep message slides to a third at most and never two in a row.
4. Write the presentation to a `.md` file. Put the key phrase of every heading in `**bold**`. Every slide gets a settings comment with a `title`, a `label`, and a `footer` that adds one useful line. Set `title:` in the front matter, and `brand:` when you know the organization or product.
5. Validate:

   ```bash
   node scripts/render.mjs slides.md --check --format
   ```

   It prints one line per slide (number, kind, heading) or a `Line N:` error, then a `Warning:` line for each missing slide setting or for too many plain slides. `--format` also tidies the file (aligned tables, consistent spacing) without changing what it shows. Fix every error and every warning and run it again until it is clean. Never hand back a presentation that fails the check.

6. Render the HTML next to it, as in "Render", unless the user asked for Markdown only.
7. Reply with one or two sentences about what you made, the slide list from the check, both files, and the share link if the render printed one. Say the Markdown is the source: they can edit it and ask for the HTML again.

When the user asks for changes, edit the Markdown in place, validate, and render again. Keep slides they didn't mention as they were.

## Render

```bash
node scripts/render.mjs slides.md -o slides.html
```

Options:

- `--theme room-dark|room-light` overrides the presentation's front-matter `theme:`.
- `--tone graphite|plum|wine|teal|bronze` overrides the presentation's `tone:`, the background tone and the color of highlighted heading words. Any `#hex` color works too.
- `--font classic|inter|figtree|bricolage-grotesque|space-grotesk|archivo-expanded|golos-text` overrides the presentation's `font:`. The chosen font is embedded, so the file still works offline.
- `--scale normal|large|kiosk` overrides the presentation's `scale:`. `kiosk` makes headings as big as each one allows, for screens read from a distance.
- `--brand <text>` replaces the `kiosk.` mark in the corner of every slide; `--brand none` hides it.
- `--images <dir>` is the folder that `/images/…` paths resolve against. The default is the presentation's own folder, so `/images/logo.png` is read from `<presentation folder>/images/logo.png`.
- `--transition gentle|fade|slide|none` overrides the presentation's `transition:`. `gentle` is a soft rise and fade; `none` cuts instantly.
- `--share-safe` (or `share-safe: true` in the front matter) starts the presentation in screen-share safe mode: every transition becomes a quick flat fade that stays crisp on video calls and meeting-room TVs. Pressing `S` in the exported presentation toggles it.
- `--no-motion` is the same as `--transition none`.
- `--no-credit` (or `credit: false` in the front matter) drops the “Made with Kiosk Slides” link from the end-of-presentation notice. It never appears on a slide.
- `--no-link` skips the share link described below.
- `--check` only validates and prints the slide list and any warnings, without writing HTML.
- `--format` tidies the Markdown file in place without changing what it shows.

After writing the HTML, the renderer prints `Open in your browser: https://…` when the presentation is small enough to share by link. The whole presentation lives in that link, so it opens the same slides on a phone, a TV or another computer with nothing uploaded. Give the person that link next to the files in one sentence, exactly as printed; never shorten it with a link service. When no link is printed, the HTML file is the way to share it.

If it fails, the message starts with `Line N:` and names the rule; fix the Markdown and run it again. An image error means a URL could not be fetched or a `/images/` file is missing; ask the user for the file or remove that slide's image.

Use `room-dark` for screens in dim rooms, TVs, and kiosks, and `room-light` for bright rooms and projectors that wash out dark backgrounds. Keep graphite unless the user asks for color or names a brand color; then set it with `tone:` in the front matter or `--tone`. For an unattended screen or a big room, pass `--scale kiosk`.

When you hand over the HTML, say how to present it:

- Open it in any browser and go full screen (F11, or Ctrl+Cmd+F on a Mac).
- Arrow keys, Page Up/Down, Space, or the scroll wheel move between slides.
- P toggles autoplay; any click or manual move pauses it. Durations and looping come from the presentation.

## Rules that are easy to miss

- Exactly one `#` heading per slide, at most 115 visible characters. No `##`.
- Body text totals at most 320 characters per slide.
- One widget per slide at most.
- `-->` ends any HTML comment early. Write `->` or "to" inside comments.
- Bullet lists only exist under `<!-- flow -->` or `<!-- buttons -->`. Anywhere else a bullet list is an error, so use a numbered list (steps) or a table.
- Annotation comments sit on the line directly above their block, with no blank line between.
- Chart cells are bare numbers: no units, no `%`. Put the unit in the column header.
- Images are `https://`, `/images/…`, or `data:image/…;base64,…`. Never invent an image URL; ask for one or leave the image out.
- Buttons and heading links are `https://` only. Never invent a URL either.

## Writing well

Follow "Writing a good presentation" in FORMAT.md, and run its checklist before you hand the presentation over.
