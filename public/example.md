---
title: Kiosk Slides — example deck
theme: room-dark
autoplay:
  duration: 12s
  loop: true
---

:::meta
title: Opening
label: Core concept
footer: One point per slide, visible from the back of the room.
layout: auto
:::

# Make your point ==impossible to miss==

Big type. One idea. No visual clutter.

---

:::meta
title: The problem
label: Before / after
footer: Give the audience the contrast before giving them details.
:::

# Replace dense slides with ==clear decisions==

:::before-after
before: A small title, six paragraphs, and a chart nobody can read from the TV.
after: One large conclusion with the evidence that matters most.
:::

---

:::meta
title: How it works
label: Three steps
footer: The Markdown remains editable even when AI drafts it.
:::

# Go from source to story in ==three steps==

1. Gather the material and name the audience.
2. Generate a short Markdown deck.
3. Validate, review, and present.

---

:::meta
title: A simple workflow
label: Inside
footer: Two starting ideas can merge into one clear path.
layout: stacked
:::

# Turn separate inputs into ==one flow==

:::flow
starts: [Customer question, Working demo]
- Draft the message
- Check the slide
- Present the result
:::

---

:::meta
title: The format
label: Editable
footer: The build command is illustrative until the CLI is implemented.
layout: split-left
:::

# Keep the source ==simple==

```sh
kiosk build talk.md --out dist/
```

---

:::meta
title: Scale
label: You win
footer: A headline should survive a room, a TV, and a shared browser window.
:::

# Design for the ==last row==

:::metric
value: 1
caption: Main idea per slide
:::

---

:::meta
title: Live demonstration
label: Agent chat
footer: The local service and its permitted tools are configured by the host.
layout: split-left
:::

# Show the agent ==at work==

:::agent-chat
profile: demo-codex
heading: Ask the local agent
:::

---

:::meta
title: Closing
label: Takeaway
footer: Press P for unattended looping; any click or manual move pauses it.
:::

# The message should be ==seen and remembered==
