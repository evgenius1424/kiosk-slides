# Kiosk Slides

A Next.js site where you write or chat a presentation in Markdown and present it as HTML slides. Two agent skills under `skills/` do the same without the site. Read [README.md](README.md) for the product and [FORMAT.md](FORMAT.md) for the presentation format. Use the words in [GLOSSARY.md](GLOSSARY.md): "presentation" and "slide", never "deck", in anything a person or an AI reads.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commands

Use pnpm (version pinned in `package.json`) and Node 20.9 or later.

| Command             | Use it for                                                       |
| ------------------- | ---------------------------------------------------------------- |
| `pnpm dev`          | Local site on http://127.0.0.1:3000 (Ask AI only works here)     |
| `pnpm check`        | Format check, Oxlint, `tsc`, Knip and Vitest. Run before pushing |
| `pnpm format`       | Prettier write                                                   |
| `pnpm lint:fix`     | Oxlint with safe fixes                                           |
| `pnpm test`         | Vitest, or `pnpm test lib/deck` for one area                     |
| `pnpm build`        | Production build                                                 |
| `pnpm build:skills` | Bundle `skills/render.ts` and copy references and fonts          |

CI (`.github/workflows/ci.yml`) runs every step of `pnpm check`, then `pnpm build` and `pnpm build:skills`, and fails if the built skills differ from what is committed.

## Layout

| Path                  | What lives there                                                               |
| --------------------- | ------------------------------------------------------------------------------ |
| `app/`                | Next.js routes: the page, metadata, ChatGPT sign-in and chat API routes        |
| `components/`         | Workspace UI (`kiosk-workspace.tsx`, `deck-chat.tsx`, `presentation-menu.tsx`) |
| `components/slide/`   | Shared slide renderer and the exported single-file HTML (`deck-html.tsx`)      |
| `lib/deck/`           | Markdown presentation parser, widgets, themes, fonts and front matter          |
| `lib/slide-styles.ts` | Slide CSS shared by the site, the export and the skills                        |
| `lib/chat*.ts`        | AI prompt and the local ChatGPT plan-usage client                              |
| `messages/en.json`    | Every UI string, read through next-intl                                        |
| `skills/`             | The two agent skills; `scripts/`, `references/` and `assets/` are generated    |
| `.claude-plugin/`     | Plugin and marketplace manifests that publish the skills                       |
| `.scratch/`           | Specs and issues as Markdown (see Agent skills below)                          |

## Conventions

- UI text goes in `messages/en.json` and is read with `useTranslations`. Parser errors, the AI prompt and the shared renderer stay English in code.
- Site copy is plain and non-technical, with no product or brand names.
- The site export and `skills/render.ts` share one renderer and must never drift. After touching `components/slide/`, `lib/deck/` or `lib/slide-styles.ts`, run `pnpm build:skills`, commit what it generates (installers copy the skills straight from GitHub), and check a skill-rendered presentation matches the site download.
- Presentation format changes update `FORMAT.md` and `public/example.md` together; tests read both.
- Keep comments to a minimum and skip doc comments on functions.
- Public functions and constants go at the top of a file, helpers at the bottom.
- Prettier owns formatting and Oxlint owns linting; don't hand-format or add disable comments without a reason.
- Knip fails on unused files, exports and dependencies, so delete what you stop using.

## Agent skills

### Issue tracker

Local markdown: issues and specs live as files under `.scratch/<feature>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
