# Spec: live editing, with no Update slides button

Status: ready-for-agent
Blocked by: (none)
Track: B (editor), step 1

## Problem

The Edit tab is a plain textarea. Nothing changes until you press **Update slides**, there is a "discard your edits?" confirm, and an error shows only after pressing the button. Evgenii: "do not like button rebuild deck, it seems everything is automatic."

## Decision

- **Slides follow the text.** Parse the editor text about 300 ms after typing stops. When it parses, the slides, slide list and saved presentation update right away. When it doesn't, the slides keep the last version that parsed, and the error shows under the editor.
- **Errors point at the line.** Show the parser's `Line N:` message with a "Go to line" action that selects that line in the textarea and scrolls to it. Mark the editor with a quiet error state; no modal.
- **Saving is automatic.** Save the text to the library on every change, even while it doesn't parse, so nothing typed is lost. On load, a presentation that doesn't parse opens in Edit with its error and an empty preview state; the app must not crash.
- **Update slides becomes Tidy.** The button runs `formatPresentation` (aligned tables, blank lines, `-` bullets) and is disabled while the text doesn't parse. Ctrl/⌘ S stays as the shortcut for Tidy. The "discard edits" confirm and the draft/source split go away: there is one source.
- **Text and slides stay in step.** On wide screens (about 1200 px and up), Edit shows the slide being edited beside the text. Moving the caret into a slide selects that slide, and clicking a slide in the slide list moves the caret to its first line.
- Copy updates in `messages/en.json`: the editor status line no longer says "press Update slides", and the Help panel and Copy prompt text say "paste it in Edit" without the button step.

## Where it lands

`components/kiosk-workspace.tsx` (the `draft` / `source` state, `editor.*` keys, the keyboard handler), `messages/en.json`, `global.d.ts` key types. Consider pulling the editor into `components/presentation-editor.tsx` while here, since the workspace file is 1,093 lines and every editor-track spec touches it.

## Acceptance

- [ ] Typing a word in a heading updates the preview without pressing anything.
- [ ] Breaking a table shows `Line N: …` with Go to line, while the preview still shows the last good slides.
- [ ] Reload mid-edit keeps the typed text, including invalid text.
- [ ] Tidy aligns a messy table, and Ctrl/⌘ S does the same.
- [ ] No "Update slides" string remains in the catalog; Knip is clean.
- [ ] Component tests cover: debounced update, error kept with last good slides, caret-to-slide sync.

## Out of scope

Syntax highlighting, a code editor library, or any WYSIWYG editing.
