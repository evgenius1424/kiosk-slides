---
name: kiosk-slides
description: Create, revise, check, re-theme, or render a Kiosk Slides presentation as Markdown and one self-contained HTML file.
disable-model-invocation: true
argument-hint: <presentation request>
---

# Kiosk Slides

A presentation is one Markdown file, and `scripts/render.mjs` renders it to the same HTML the Kiosk Slides site downloads: identical slide markup and styles, every image and font embedded, keyboard and autoplay controls built in, no server or network needed to present it. It needs Node 18 or later and nothing else.

The Markdown is always the source. Don't edit the generated HTML by hand; change the Markdown or the render options and render again.

## Pick the path

- **Write**: the user has notes, a document, a conversation, or only an idea, or wants changes to a presentation. Follow "Write a presentation", which ends with the HTML too.
- **Render**: the user already has a presentation `.md` and wants HTML, a new look, or a check. Go straight to "Render".

## Write a presentation

The full grammar is in `references/FORMAT.md` and a presentation that uses every slide kind is `references/example.md`. Read both before writing the first presentation in a conversation. A parser enforces every rule in FORMAT.md and rejects the whole presentation on the first violation, so follow it exactly.

1. Find out what the presentation is for: the audience, the one thing they should remember, and where it plays (a room, a call, an unattended screen). If the user already said, don't ask again. If a detail is missing and a sensible default exists, use the default and say which.
2. Outline before writing: one idea per slide, 5–12 slides, a closing slide that restates the message.
3. Pick a widget for each slide from what its content is, using the table in "Writing a good presentation" in FORMAT.md. Keep message slides to a third at most and never two in a row.
4. Write the presentation to a `.md` file. Put the key phrase of every heading in `**bold**`. Every slide gets a slide settings comment with a `title` (the slide title), a `label`, and a `footer` that adds one useful line. Set `title:` in the front matter, and `brand:` when you know the organization or product. Leave `font:` unset (it defaults to `classic`) unless the user asks for a different one.
5. Validate:

   ```bash
   node scripts/render.mjs slides.md --check --format
   ```

   It prints one line per slide (number, kind, heading) or a `Line N:` error, then a `Warning:` line for each missing slide setting or for too many message slides. `--format` also tidies the file (aligned tables, consistent spacing) without changing what it shows. Fix every error and every warning and run it again until it is clean. Never hand back a presentation that fails the check.

6. Render the HTML next to it, as in "Render", unless the user asked for Markdown only.
7. Reply with one or two sentences about what you made, the slide list from the check, and both files. Say the Markdown is the source: they can edit it and ask for the HTML again.

When the user asks for changes, edit the Markdown in place, validate, and render again. Keep slides they didn't mention as they were.

## Render

```bash
node scripts/render.mjs slides.md -o slides.html
```

Options:

- `--theme room-dark|room-light|studio|paper|poster|marker` overrides the presentation's front-matter `theme:`.
- `--tone mono|violet|coral|teal|amber` overrides the presentation's `tone:`, the background tone and the color of highlighted heading words. Any `#hex` color works too.
- `--font classic|inter|figtree|bricolage-grotesque|space-grotesk|archivo-expanded|golos-text|literata` overrides the presentation's `font:`. The chosen font is embedded, so the file still works offline.
- `--scale normal|large|hero` overrides the presentation's `scale:`. `hero` makes headings as big as each one allows, for screens read from a distance.
- `--brand <text>` replaces the `kiosk.` mark in the corner of every slide; `--brand none` hides it.
- `--images <dir>` is the folder that `/images/…` paths resolve against. The default is the presentation's own folder, so `/images/logo.png` is read from `<presentation folder>/images/logo.png`.
- `--transition gentle|fade|slide|none` overrides the presentation's `transition:`. `gentle` is a soft rise and fade; `none` cuts instantly.
- `--share-safe` (or `share-safe: true` in the front matter) starts the presentation in screen-share safe mode: every transition becomes a quick flat fade that stays crisp on video calls and meeting-room TVs. Pressing `S` in the rendered presentation toggles it.
- `--no-motion` is the same as `--transition none`.
- `--no-credit` (or `credit: false` in the front matter) drops the “Made with Kiosk Slides” link from the end-of-presentation notice. It never appears on a slide.
- `--no-link` skips the share link described below, so the HTML file opens instead.
- `--no-open` writes the HTML without opening the browser.
- `--check` only validates and prints the slide list and any warnings, without writing HTML.
- `--format` tidies the Markdown file in place without changing what it shows.

After writing the HTML, the renderer opens the presentation in the person's browser and prints `Opened in your browser`. It opens the share link when the presentation is small enough: the whole presentation lives in that link, so it shows the same slides on a phone, a TV or another computer with nothing uploaded. Otherwise it opens the HTML file. Say in one sentence that it is open in their browser. Never print, paste or shorten the link.

When there is no browser to open, such as over SSH or in a cloud session, nothing opens and nothing is printed. Then the HTML file is how the person sees the slides: hand it over and say how to present it.

For a PDF, open the HTML in a desktop browser and print it with Save as PDF: every slide prints on its own 16:9 page, in the same theme, tone and font, with selectable text. No other tool is needed.

If it fails, the message starts with `Line N:` and names the rule; fix the Markdown and run it again. An image error means a URL could not be fetched or a `/images/` file is missing; ask the user for the file or remove that slide's image.

Use `room-dark` for screens in dim rooms, TVs, and kiosks, `room-light` for bright rooms and projectors that wash out dark backgrounds, `studio` for a bold true-black look on stage screens and video, `paper` for a warm, book-like talk, `poster` for a loud full-color look, and `marker` for bright rooms where the key words should pop out in a colored pill. Keep the default black and white `mono` tone unless the user asks for a color or one that matches their organization; then set it with `tone:` in the front matter or `--tone`. For an unattended screen or a big room, pass `--scale hero`.

When you hand over the HTML, say how to present it:

- Open it in any browser and go full screen (F11, or Ctrl+Cmd+F on a Mac).
- Arrow keys, Page Up/Down, Space, or the scroll wheel move between slides.
- P toggles autoplay; any click or manual move pauses it. Durations and looping come from the presentation.

## Rules that are easy to miss

- Exactly one `#` heading per slide, at most 115 visible characters. No `##`.
- A line directly under the heading, with no blank line between, continues the heading on a new line. Leave a blank line before the body.
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
