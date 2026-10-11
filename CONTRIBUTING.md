# Contributing

Thanks for wanting to help. Kiosk Slides has a strong point of view, so please read this before you open a pull request.

## The idea comes first

Kiosk Slides makes slides that are seen, not built. Every component is already balanced for a shared screen or a meeting-room TV, and there is no manual layout editing on purpose. Changes that add drag-and-drop, free positioning or per-slide style overrides will not be accepted, however well they are made.

Good contributions make presentations read better from across a room, make the Markdown format easier for AI to write, or make the site simpler to use.

## Before you start

- **Bugs:** open an issue with the presentation Markdown that shows the problem, what you expected and what you saw. A screenshot helps.
- **New components, themes or format changes:** open an issue first so we can agree on the idea before you spend time on it.
- **Small fixes** like typos and obvious bugs can go straight to a pull request.

## Local setup

You need Node 20.9 or later and pnpm (`corepack enable` picks the version pinned in `package.json`).

```bash
pnpm install
pnpm dev
```

| Command             | What it does                                                                 |
| ------------------- | ---------------------------------------------------------------------------- |
| `pnpm check`        | Everything CI runs except the build: format, lint, types, unused code, tests |
| `pnpm format`       | Format every file with Prettier                                              |
| `pnpm lint:fix`     | Lint with Oxlint and apply safe fixes                                        |
| `pnpm test`         | Run the Vitest suite                                                         |
| `pnpm build`        | Production build of the site                                                 |
| `pnpm build:skills` | Package the agent skill from the shared renderer                             |

Open http://127.0.0.1:3000. Ask AI only works on 127.0.0.1, signed in with your own ChatGPT plan.

## Pull requests

- Keep each pull request to one change.
- Run `pnpm check` and `pnpm build` before you push. CI runs the same steps.
- If you change the renderer, also run `pnpm build:skills`, commit the files it generates, and check that a presentation rendered by the skill looks the same as one downloaded from the site. The two must never drift.
- If you change the presentation format, update [FORMAT.md](FORMAT.md) and [public/example.md](public/example.md) in the same pull request.
- Keep site copy plain and non-technical. People come here to get a presentation in a minute.

## Code style

- Match the code around you.
- Keep comments to a minimum and skip doc comments on functions.
- Put public functions and constants at the top of a file and helpers at the bottom.

## License

By contributing, you agree that your work is released under the [MIT License](LICENSE).
