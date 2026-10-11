# Contributing

Thanks for wanting to help. Kiosk Slides has a strong point of view, so please read this before you open a pull request.

## The idea comes first

Kiosk Slides makes slides that are seen, not built. Every component is already balanced for a shared screen or a meeting-room TV, and there is no manual layout editing on purpose. Changes that add drag-and-drop, free positioning or per-slide style overrides will not be accepted, however well they are made.

Good contributions make decks read better from across a room, make the Markdown format easier for AI to write, or make the site simpler to use.

## Before you start

- **Bugs:** open an issue with the deck Markdown that shows the problem, what you expected and what you saw. A screenshot helps.
- **New components, themes or format changes:** open an issue first so we can agree on the idea before you spend time on it.
- **Small fixes** like typos and obvious bugs can go straight to a pull request.

## Local setup

You need Node 18 or later and pnpm.

```bash
pnpm install
pnpm dev
pnpm test
```

Open http://127.0.0.1:3000. Ask AI only works on 127.0.0.1, signed in with your own ChatGPT plan.

## Pull requests

- Keep each pull request to one change.
- Run `pnpm test` and `pnpm build` before you push.
- If you change the renderer, also run `pnpm build:skills` and check that a deck rendered by the skill looks the same as one downloaded from the site. The two must never drift.
- If you change the deck format, update [FORMAT.md](FORMAT.md) and [public/example.md](public/example.md) in the same pull request.
- Keep site copy plain and non-technical. People come here to get a deck in a minute.

## Code style

- Match the code around you.
- Keep comments to a minimum and skip doc comments on functions.
- Put public functions and constants at the top of a file and helpers at the bottom.

## License

By contributing, you agree that your work is released under the [MIT License](LICENSE).
