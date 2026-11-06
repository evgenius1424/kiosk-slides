# Kiosk Slides presentation format

A presentation is one Markdown file. A parser rejects any rule break below with an error naming the line.

## Front matter

Optional, between `---` lines at the very top of the file:

- `title:` the presentation title. Always set it.
- `brand:` the organization, product or event in one or two words, when you know it. At most 24 characters.
- `language: ru` when the presentation is in Russian. Leave it out for English.
- `tone:` only when the talk suggests a mood: `teal` calm, `coral` warm, `violet` creative, `amber` classic.

Write no other front matter. The person presenting picks the theme, font, text size, transitions and timing.

## Slides

Slides are separated by a line holding only `---` (a `---` inside a code fence doesn't count). A presentation has 1–40 slides; prefer 5–12. A slide is, in order:

1. **Slide settings**: one HTML comment that is the slide's first block, directly followed by the heading. It has one `key: value` per line, and the only keys are `title`, `label` and `footer`, all free text. `-->` can't appear inside any comment, because it closes it early: write `->` or "to" instead.
2. **Exactly one `#` heading** of at most 115 visible characters. Wrap the key phrase in `**bold**`; `*italic*`, `` `code` `` and links are also allowed, nothing else. No `##` or deeper headings. A line directly under the heading, with no blank line between, continues it on a new line. Leave a blank line after the heading.
3. **Body** (optional): plain paragraphs, at most 320 characters in total. `**bold**`, `*italic*`, `` `code` ``, `~~strike~~` and links work here and inside widgets.
4. **At most one widget** (optional), before, between or after the body paragraphs. A slide with no widget is a message slide.

Anything else (nested lists, raw HTML, extra `---` rules, other Markdown) is an error, not ignored.

## Widgets

A widget whose row below names an annotation needs that comment, such as `<!-- flow -->` or `<!-- chart: type=bar -->`, on the line directly above its block, with no blank line between. The others are recognised from their Markdown and never take an annotation. Only `chart` takes settings, written as `key=value` with no spaces: `type` is required (`bar` or `line`), `x` names the label column (default: the first), and `y` names the one column to plot (default: every other column). Column names match the header exactly.

| Widget | Write | Limits |
| --- | --- | --- |
| steps | a `1.` `2.` `3.` numbered list | 5 items of 95 characters, no nesting |
| bullets | a `-` list | 5 items of 95 characters, no nesting |
| checklist | `- [x]` and `- [ ]` items | 5 items of 95 characters, every item ticked or unticked |
| quote | `>` lines, the last one `— Name` for the attribution | 200 characters of quote, 60 of name |
| code | a fenced block with its language | 12 lines, 450 characters |
| table | a Markdown table | 5 columns, 1–6 body rows |
| before-after | a 2-column table headed exactly `Before \| After` | exactly 1 body row |
| chart | the chart annotation above a table | 5 columns, 1–6 rows, every row labelled, plotted cells plain numbers such as `82` or `1,450` with no units or `%` |
| metric | the metric annotation, a `**value**` line, and a caption on the very next line | the caption is not empty |
| flow | the flow annotation above `- A -> B -> C` bullets | 2 bullets of 4 boxes, every box has text, no box twice in a bullet, no loops; the same text in both bullets is one shared box |
| buttons | the buttons annotation above `- [Label](https://…)` bullets | 3 buttons, `https://` only, labels of 1–40 characters |
| image | `![alt](https://… "caption")` alone in a paragraph | alt text that describes the image; alt and caption 450 characters each |

## Writing a good presentation

The parser accepts slides without settings or widgets, but they look unfinished. Treat these rules as strictly as the grammar.

- **Every slide starts with slide settings holding `title`, `label` and `footer`**, the first and last slides included. The slide title names the part of the talk in one to three words (`Problem`, `Plan`, `Results`). The label says what this slide shows in two to four words (`Three steps`, `Before / after`). The footer is one short sentence that adds a fact, a source or the takeaway, and never repeats the heading.
- **Show, don't just say.** Pick each slide's widget from what its content is:
  - a sequence of actions: steps
  - a few points in no order: bullets
  - done and to-do items: checklist
  - someone's words: quote
  - one striking number: metric
  - a change or comparison: before-after
  - several items with attributes: table
  - numbers over categories or time: chart
  - a process or pipeline: flow
  - something to read or copy: code
  - a screenshot, logo or photo: image
  - where to go next: buttons
  - one statement: a message slide
- **Few message slides.** At most a third of the slides (two in a short presentation) are message slides, usually the opening and the closing. Never put two in a row. A presentation of six or more slides uses at least four different widgets.
- **Headlines state the point**, not the topic ("Short presentations **hold attention**", not "Attention span"). When a short, punchy heading reads better in two parts, break it where you would pause. Write for the last row of the room: plain words, one idea per slide, and no body text the heading or widget already says.

## Check before you reply

1. The front matter has a `title:`.
2. Every slide opens with `<!--` and a `title:`, `label:` and `footer:` line, closed by `-->`.
3. No more than a third of the slides are message slides, and no two are next to each other.
4. Every annotation sits on the line directly above its block.
5. Every slide has exactly one `#` heading with a bolded key phrase.
