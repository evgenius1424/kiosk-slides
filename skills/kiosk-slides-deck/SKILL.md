---
name: kiosk-slides-deck
description: Turn a conversation, notes, or a document into a Kiosk Slides presentation, the Markdown format that presents one clear idea per slide on a TV, in a room, or on a call. Use when the user wants a presentation, slides, a deck, or a kiosk loop written or revised, and to check a presentation against the format.
---

# Kiosk Slides presentation

A presentation is one Markdown file. The full grammar is in `references/FORMAT.md` and a presentation that uses every slide kind is `references/example.md`. Read both before writing the first presentation in a conversation. A parser enforces every rule in FORMAT.md and rejects the whole presentation on the first violation, so follow it exactly.

## Workflow

1. Find out what the presentation is for: the audience, the one thing they should remember, and where it plays (a room, a call, an unattended screen). If the user already said, don't ask again. If a detail is missing and a sensible default exists, use the default and say which.
2. Outline before writing: one idea per slide, 5–12 slides, a closing slide that restates the message.
3. Pick a widget for each slide from what its content is, using the table in "Writing a good presentation" in FORMAT.md. Keep message slides to a third at most and never two in a row.
4. Write the presentation to a `.md` file. Put the key phrase of every heading in `**bold**`. Every slide gets a settings comment with a `title`, a `label`, and a `footer` that adds one useful line. Set `title:` in the front matter, and `brand:` when you know the organization or product.
5. Validate:

   ```bash
   node scripts/render.mjs slides.md --check --format
   ```

   It prints one line per slide (number, kind, heading) or a `Line N:` error, then a `Warning:` line for each missing slide setting or for too many plain slides. `--format` also tidies the file (aligned tables, consistent spacing) without changing what it shows. Fix every error and every warning and run it again until it is clean. Never hand back a presentation that fails the check.

6. Reply with one or two sentences about what you made, the slide list from the check, and the file. If the user wants HTML, hand the file to the `kiosk-slides-render` skill.

When the user asks for changes, edit the file in place and validate again. Keep slides they didn't mention as they were.

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
