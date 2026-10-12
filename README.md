# Kiosk Slides

**Slides made to be seen. Ready in seconds.**

Tell an AI what you want to say. Get a clean, finished presentation back, and put it on the screen. No dragging boxes, no picking layouts, no nudging text. Just your point, big and clear.

## Why "Kiosk"

A kiosk screen has one job: to be read at a glance, from a distance, by someone who is busy. It plays in a lobby, on a meeting-room TV, or in a shared window on a call, and nobody gets to lean in and squint.

That is the bar every Kiosk Slides presentation is built to clear. One idea per slide. Headlines that fill the screen. Text sized for the last row of the room and still sharp after screen sharing has squeezed it. If a slide can't be read from across the room, it isn't a kiosk slide.

## Seconds, not hours

Most slide tools give you a blank canvas and a hundred controls. Then you spend the afternoon aligning things.

Kiosk Slides takes the opposite view: **manual layout is obsolete.** You bring the content, the AI shapes it, and every slide comes out balanced because every piece was designed to work together:

- Headlines that size themselves to fit, so a one-word slide fills the screen and a long one still lands.
- Steps, numbers, before-and-after, tables, charts, flows, code, images and buttons, each tuned to look right next to the others.
- Spacing, color and type that are already decided, so there is nothing to fiddle with and nothing to get wrong.

Describe your talk, read the result, press Present. That is the whole workflow.

## Built for screen sharing

Slides today are mostly seen through a video call or on a TV across a table. Kiosk Slides is designed for that, not for a printed handout:

- **Screen-share safe mode** turns every transition into a quick, flat fade that stays crisp when the picture is compressed. Press `S` while presenting.
- **Calm transitions**: Gentle, Crossfade, Slide, or none at all.
- **Big text sizes**, up to an extra large setting meant for reading from across the room.
- **Autoplay and looping**, so a presentation can run on its own on an unattended screen.

## What you get

- **Ask AI.** Chat with ChatGPT using your own ChatGPT plan, and watch the slides appear. Sign-in runs on your own computer, so your account never touches a server.
- **Use any AI.** Copy the ready-made prompt into Gemini, ChatGPT, Claude or anything else, then paste the slides it writes.
- **Dark and light themes** with five quiet background tones: Graphite, Plum, Wine, Teal and Bronze.
- **Fonts** including Inter, Figtree, Bricolage Grotesque, Space Grotesk, Archivo Expanded and Golos Text, each with Cyrillic letters.
- **Your brand** in the corner of every slide, or nothing at all.
- **Present anywhere**, including from a phone held sideways, with swipe and tap.
- **Many presentations**, saved in your browser and one click apart.
- **Works offline and installs as an app.** After one visit the site opens, edits, presents and downloads with no connection. Only Ask AI needs the internet.
- **One-file download.** Every presentation downloads as a single HTML file with its images and fonts inside. It opens in any browser, works offline, and needs nothing installed.
- **Share by link.** The link carries the whole presentation. Nothing is uploaded: the slides live in the link itself.

## Skill for your AI

The same thing, without the website. The **kiosk-slides** skill in [`skills/`](skills/kiosk-slides) lets an AI agent turn a conversation, notes or a document into a presentation, check it against the format, and render it to the same single-file HTML the site downloads. You get both files: the Markdown to edit, and the HTML to present. It also renders or re-themes a presentation you already have, with your choice of theme, tone, font, text size and transition.

It shares the site's own renderer, so a presentation looks exactly the same wherever it was made. It needs Node 18 or later.

### Install

Plugins update themselves. The `npx skills` route copies the files into your project, and you update them by hand. Pick one per agent, or you get the skill twice.

<details>
<summary><strong>Claude Code</strong></summary>

```bash
/plugin marketplace add evgenius1424/kiosk-slides
/plugin install kiosk-slides@kiosk-slides
```

</details>

<details>
<summary><strong>Claude app</strong> (claude.ai and desktop)</summary>

Download `kiosk-slides.zip` from the [latest release](https://github.com/evgenius1424/kiosk-slides/releases/latest), then add it under **Settings → Capabilities → Skills**.

</details>

<details>
<summary><strong>Codex</strong></summary>

```bash
codex plugin marketplace add evgenius1424/kiosk-slides
codex plugin add kiosk-slides@kiosk-slides
```

</details>

<details>
<summary><strong>GitHub Copilot</strong> (CLI and VS Code)</summary>

```bash
copilot plugin marketplace add evgenius1424/kiosk-slides
copilot plugin install kiosk-slides@kiosk-slides
```

In VS Code, run **Chat: Install Plugin From Source** and enter `https://github.com/evgenius1424/kiosk-slides`.

</details>

<details>
<summary><strong>Gemini CLI</strong></summary>

```bash
gemini skills install https://github.com/evgenius1424/kiosk-slides.git --path skills
```

Re-run it to update.

</details>

<details>
<summary><strong>Cursor, OpenCode, Windsurf, Amp and others</strong></summary>

```bash
npx skills@latest add evgenius1424/kiosk-slides
```

Update with `npx skills@latest update`.

</details>

Then ask your agent for a presentation, for example "make a 6-slide presentation about our Q3 results".

## Run it yourself

```bash
git clone https://github.com/evgenius1424/kiosk-slides
cd kiosk-slides
pnpm install
pnpm dev
```

Open http://127.0.0.1:3000. Running it on your own computer is what turns on Ask AI with your ChatGPT plan.

The presentation format is described in [FORMAT.md](FORMAT.md), with a full example in [public/example.md](public/example.md).

## Made by

Kiosk Slides is the idea and work of [Evgenii](https://github.com/evgenius1424): slides that are seen, not built.

## License

Kiosk Slides is open source under the [MIT License](LICENSE). The bundled fonts are under the SIL Open Font License, listed in [public/fonts/LICENSE.md](public/fonts/LICENSE.md).

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), and report security problems privately as described in [SECURITY.md](SECURITY.md).
