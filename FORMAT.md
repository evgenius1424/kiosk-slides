# Kiosk Slides deck format

A deck is one Markdown file (GitHub-flavored). Plain Markdown carries the meaning. A short HTML comment is used only where the Markdown shape alone is ambiguous. A parser (`parseDeck` in `lib/deck/`) enforces every rule below. It rejects a deck that breaks one, and every error starts with `Line N:` pointing at the offending line. `public/example.md` is a complete deck that uses every slide kind.

## Deck structure

````markdown
---
title: Quarterly review
theme: room-dark
autoplay:
  duration: 12s
  loop: true
---

# First slide's **big idea**

---

# Second slide
````

- **Front matter** (optional) goes between `---` lines at the very top of the file:
  - `title:` is the deck title (default `Untitled deck`).
  - `theme:` is `room-dark` or `room-light`.
  - `duration: Ns` is the autoplay time per slide in seconds. The default is 12, and it is clamped to 2–120.
  - `loop: false` stops autoplay at the end. Looping is on by default.
  - `font:` is `classic` (default, Arial), `inter`, `figtree`, `bricolage-grotesque`, `zalando-sans`, or `zalando-sans-expanded`. The font's name works too, like `Zalando Sans`.
  - `scale:` is `normal` (default), `large`, or `kiosk`. `large` and `kiosk` size every heading to its length, so a one-word slide fills the screen and a long one still fits, and `kiosk` also enlarges the body for reading from across a room.
  - `brand:` is the word in the corner of every slide, at most 24 characters. The default is `kiosk`; `none` hides it.
- **Slides** are separated by a line containing only `---`. A `---` line inside a ```` ``` ```` code fence does not split slides.
- A deck has 1–40 slides. Prefer 5–12.

## A slide

````markdown
<!--
title: Opening
label: Core concept
footer: One point per slide, visible from the back of the room.
layout: split-left
duration: 20s
-->

# Make your point **impossible to miss**

Big type. One idea. No visual clutter.
````

In order, a slide has:

1. **Slide settings** (optional): one HTML comment that is the slide's first block, directly followed by the `#` heading. It has one `key: value` per line, and every key is optional:
   - `title`, `label`, `footer` are free text shown around the slide.
   - `layout` is `auto` (default), `stacked`, or `split-left`.
   - `duration` overrides the deck's autoplay time for this slide, written like `20s`.
   - Any other key is an error.
2. **Exactly one `#` heading** of at most 115 characters. Wrap the key phrase in `**bold**` to highlight it. Headings may also use `*italic*`, `` `code` `` and `[links](https://...)`; nothing else, and the 115 characters count the visible text, not the markup. Other heading levels (`##` and deeper) are not supported.
3. **Body paragraphs** (optional): plain paragraphs, with inline Markdown kept as written. All the body text together must be at most 320 characters.
4. **At most one supporting widget** (optional). It can go before, between, or after the body paragraphs. A slide with no widget is a *message* slide.

> **`-->` can't appear inside any HTML comment**, slide settings included. It closes the comment early. Write `->` or "to" instead (for example, `footer: Draft -> Deck`).

**Unsupported Markdown is an error, not ignored.** Blockquotes, `##` headings, bullet lists without an annotation, raw HTML, horizontal rules other than the slide separator, and anything else not listed here are rejected with `This slide has markdown the format doesn’t support (…)`.

## Annotations

Some widgets are written as ordinary Markdown with one annotation comment on the line **directly above** them. There is no blank line between the comment and the block.

```
<!-- type -->
<!-- type: key=value key=value -->
```

- `type` is one of `flow`, `metric`, `chart`, `buttons`. Any other type is an error.
- Settings are space-separated `key=value` pairs, and values can't contain spaces.
- A comment that isn't directly above a block, or that is directly above another comment, is an error. The one exception is the slide-settings comment above the `#` heading.
- Each annotation accepts only its own settings. `chart` takes `type`, `x`, and `y`; `flow`, `metric`, and `buttons` take none. Any other key is an error that names the allowed keys, so a typo like `typ=bar` is caught.
- `-->` can't appear inside an annotation either.

Tables, before/after, steps, code, and images are never annotated. They are detected from their Markdown shape. An annotation always wins over shape detection: `<!-- chart -->` above a `Before | After` table makes a chart, not a before/after.

## Widgets

A slide may have **one** of these widgets. A second one is an error (`Use one supporting widget per slide.`).

| Kind | Write | Detected by | Caps |
|---|---|---|---|
| steps | `1.` `2.` `3.` numbered list | an ordered list | 5 items, 95 characters each, no nested lists |
| code | a fenced ```` ``` ```` block | a code fence (the info string is the language) | 12 lines, 450 characters |
| image | `![alt](src "caption")` on its own line | a paragraph holding only one image | `src` is `https://…`, `/images/…`, or `data:image/(png\|jpeg\|webp);base64,…`. Alt and caption are each 450 characters or fewer |
| table | a GFM table | any table not headed `Before \| After` and not under `<!-- chart -->` | 5 columns, 1–6 body rows |
| before-after | a table headed `Before \| After` | a 2-column table whose header is exactly Before, After (any case) | exactly 1 body row |
| chart | `<!-- chart: type=bar -->` above a table | the `chart` annotation | `type` is `bar` or `line`; 5 columns, 1–6 body rows; every row labelled; number cells only |
| metric | `<!-- metric -->` above `**value**` and a caption line | the `metric` annotation | a bold value line and a non-empty caption |
| flow | `<!-- flow -->` above `- A -> B -> C` bullets | the `flow` annotation | 2 bullets, 4 boxes each, no loops, no nested lists |
| buttons | `<!-- buttons -->` above `- [Label](https://…)` bullets | the `buttons` annotation | 3 buttons, `https://` only, labels of 1–40 characters |

### Steps

````markdown
# Go from source to story in **three steps**

1. Gather the material and name the audience.
2. Generate a short Markdown deck.
3. Validate, review, and present.
````

The list must be flat. A nested list under a step is an error (`Flatten the list — nesting isn’t supported.`).

### Code

````markdown
# Keep the source **simple**

```html
<h1>One clear idea.</h1>
```
````

### Image

````markdown
# Show it, **don't describe it**

![Team photo](https://example.com/team.jpg "The launch team")
````

### Table

````markdown
# Pick the **right widget**

| You have | Write | You get |
| --- | --- | --- |
| A sequence | A numbered list | Steps |
| Some code | A fenced block | Code |
````

Cells keep their inline Markdown as written.

### Before / after

````markdown
# One idea **per slide**

| Before | After |
| --- | --- |
| Dense slides nobody can read | One headline, seen from across the room |
````

This is a single comparison. A second body row is an error, so use a plain table for more rows.

### Chart

````markdown
# Shorter decks get **more attention**

<!-- chart: type=bar x=Slides y=Recall -->
| Slides | Recall | Viewers |
| --- | --- | --- |
| 5 | 82 | 1,400 |
| 10 | 64 | 1,200 |
````

- `type=bar` or `type=line` is required.
- `x=<column>` names the label column. The default is the first column.
- `y=<column>` names the one number column to plot. By default, every column except `x` is a separate series.
- Column names must match the header text exactly.
- Every row needs a non-empty label in the `x` column.
- Every plotted cell must be a number such as `82`, `-3`, `12.5`, or `1,450`. Commas are allowed as thousands separators. Units and `%` are not allowed.

### Metric

````markdown
# Short decks **hold attention**

<!-- metric -->
**3x**
more visitors stayed for the whole loop
````

The first line is the bold value (`**…**` or `__…__`). The caption is on the line directly below, in the same paragraph with no blank line between.

### Flow

````markdown
# Two inputs, **one deck**

<!-- flow -->
- Notes -> Draft -> Deck
- Data -> Deck
````

- Each bullet is one chain of boxes joined by `->`, and every box needs text.
- Each bullet is drawn as its own line. Boxes with exactly the same text are the same step, so the chains above meet at `Deck`: it appears on both lines, marked as shared. Bullets that share no text are drawn as two independent lines.
- A flow can't loop. A box can't repeat within one bullet, and two bullets can't share boxes in opposite orders.

### Buttons

````markdown
# Take it **further**

<!-- buttons -->
- [View the source](https://github.com/evgenius1424/kiosk-slides)
- [Read the docs](https://example.com/docs)
````

- Each bullet is exactly one `[Label](https://…)` link.
- The label is the link's plain text: formatting such as `*Go* now` is flattened to `Go now`.
- Labels must be non-empty and at most 40 characters.
- URLs must start with `https://`. Links to other slides are not supported.

## Writing well

Write for the last row of the room: short headlines, one idea per slide, plain language.
