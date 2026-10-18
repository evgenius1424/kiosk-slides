# Kiosk Slides

A Next.js site where you write or chat a presentation in Markdown and present it as HTML slides. An agent skill in `skills/kiosk-slides/` does the same without the site. Read [README.md](README.md) for the product and [FORMAT.md](FORMAT.md) for the presentation format. Use the words in [GLOSSARY.md](GLOSSARY.md): "presentation" and "slide", never "deck", in anything a person or an AI reads.

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
| `pnpm test`         | Vitest, or `pnpm test lib/presentation` for one area             |
| `pnpm build`        | Production build                                                 |
| `pnpm build:skills` | Bundle `skills/render.ts` and copy references and fonts          |

CI (`.github/workflows/ci.yml`) runs every step of `pnpm check`, then `pnpm build` and `pnpm build:skills`, and fails if the built skills differ from what is committed.

## Layout

| Path                    | What lives there                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `app/`                  | Next.js routes: the page, metadata, ChatGPT sign-in and chat API routes                |
| `components/`           | Workspace panels and dialogs (`presentation-chat.tsx`, `presentation-editor.tsx`, ...) |
| `components/workspace/` | The workspace: `kiosk-workspace.tsx` wires one hook or panel per job (see below)       |
| `components/slide/`     | Shared slide renderer and the exported single-file HTML (`presentation-html.tsx`)      |
| `lib/presentation/`     | Markdown presentation parser, widgets, themes, fonts and front matter                  |
| `lib/slide-styles.ts`   | Slide CSS shared by the site, the export and the skills                                |
| `lib/player.ts`         | Transitions, keys, swipe and wheel rules shared by every player                        |
| `lib/chat*.ts`          | AI prompt and the local ChatGPT plan-usage client                                      |
| `messages/en.json`      | Every UI string, read through next-intl                                                |
| `skills/`               | The agent skill; its `scripts/`, `references/` and `assets/` are generated             |
| `.claude-plugin/`       | Plugin and marketplace manifests that publish the skill                                |
| `.scratch/`             | Specs and issues as Markdown (see Agent skills below)                                  |

## Rendering architecture

One core turns Markdown into slides for the site preview, presenting mode, thumbnails, the HTML download and the skills:

1. **Parse**: `lib/presentation` turns Markdown into a `Presentation` (slides, look, theme, timing).
2. **Render**: `components/slide` turns each slide into markup with `SlideView`, styled by `lib/slide-styles.ts`. `presentation-html.tsx` wraps those slides into the single-file presentation.
3. **Play**: `lib/player.ts` holds the transitions and navigation rules. The site's React player and the export's inline script both read them.

Everything else is a thin adapter: `app/` and `components/workspace/` for the site, `skills/render.ts` for the command line, and `scripts/bundle-renderer.mjs` for the skills' esbuild bundle. The core imports only itself, React and remark, with no Next.js, Node or browser-only code, so changing the site's compiler or bundler never touches it. Tests hold this in place: `lib/core.test.ts` checks the core's imports, `components/slide/parity.test.tsx` checks the preview and thumbnails match the export, `components/slide/player.test.ts` checks the export player follows the shared rules, and `skills/render.test.ts` checks the esbuild-built skill writes the same file as the site.

## Workspace

`components/workspace/kiosk-workspace.tsx` only holds the view tab, open panels and the actions that cross jobs (add, delete or change a slide, undo, paste, AI replies). Each job lives in its own file:

| File                   | Job                                                                             |
| ---------------------- | ------------------------------------------------------------------------------- |
| `use-player.ts`        | Current slide, autoplay, presenting, fullscreen, idle, share-safe, `#N` address |
| `use-library.ts`       | Saved presentations, shared links, paste anywhere                               |
| `use-versions.ts`      | Undo history                                                                    |
| `use-shortcuts.ts`     | Keyboard shortcuts                                                              |
| `use-download.ts`      | Web page and PDF downloads                                                      |
| `settings-panel.tsx`   | Settings panel, writes each setting to the front matter                         |
| `slide-canvas.tsx`     | Preview canvas, wheel and swipe, fit check                                      |
| `slide-sidebar.tsx`    | Slide list                                                                      |
| `workspace-header.tsx` | Header and the Preview / Edit / Ask AI tabs                                     |
| `help-dialog.tsx`      | Shortcuts and format help                                                       |
| `toast.tsx`            | Toast messages with an optional Undo                                            |

## Conventions

- UI text goes in `messages/en.json` and is read with `useTranslations`. Parser errors, the AI prompt and the shared renderer stay English in code.
- Site copy is plain and non-technical, with no product or brand names.
- The site export and `skills/render.ts` share one renderer and must never drift. After touching `components/slide/`, `lib/presentation/` or `lib/slide-styles.ts`, run `pnpm build:skills`, commit what it generates (installers copy the skill straight from GitHub), and check a skill-rendered presentation matches the site download.
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
