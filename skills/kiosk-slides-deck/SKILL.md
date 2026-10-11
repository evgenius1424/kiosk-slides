---
name: kiosk-slides-deck
description: Turn a conversation, notes, or a document into a Kiosk Slides deck, the Markdown format that presents one clear idea per slide on a TV, in a room, or on a call. Use when the user wants slides, a deck, or a kiosk loop written or revised, and to check a deck against the format.
---

# Kiosk Slides deck

A deck is one Markdown file. The full grammar is in `references/FORMAT.md` and a deck that uses every slide kind is `references/example.md`. Read both before writing the first deck in a conversation. A parser enforces every rule in FORMAT.md and rejects the whole deck on the first violation, so follow it exactly.

## Workflow

1. Find out what the deck is for: the audience, the one thing they should remember, and where it plays (a room, a call, an unattended screen). If the user already said, don't ask again. If a detail is missing and a sensible default exists, use the default and say which.
2. Outline before writing: one idea per slide, 5–12 slides, a closing slide that restates the message.
3. Pick a widget for each slide from what the content is, not for variety:

   | The content is | Use |
   |---|---|
   | One statement | a message slide (heading and body only) |
   | A sequence of actions | steps |
   | A single striking number | metric |
   | A comparison of two states | before-after |
   | Several items with attributes | table |
   | Numbers over categories or time | chart |
   | A process or pipeline | flow |
   | Something to read or copy | code |
   | A screenshot, logo, or photo | image |
   | Where to go next | buttons |

4. Write the deck to a `.md` file. Put the key phrase of every heading in `**bold**`. Give each slide a settings comment with a short `title`, a `label`, and a `footer` that adds one useful line.
5. Validate:

   ```bash
   node scripts/render.mjs deck.md --check
   ```

   It prints one line per slide (number, kind, heading) or a `Line N:` error. Fix every error and run it again until it passes. Never hand back a deck that fails the check.
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

Write for the last row of the room. Short headlines that state the point, not the topic ("Short decks **hold attention**", not "Attention span"). Plain words. Cut any body text the heading already says.
