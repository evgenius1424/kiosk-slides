# Spec: AI actions on a slide, with undo

Status: done
Blocked by: live-editing; start-from-the-talk (both change the chat component)
Track: B (editor), step 4

## Problem

The only ways to change one slide are to edit its Markdown or to describe the change in the chat and get the whole presentation back. People want control, but the product won't add manual layout. The control that fits is a verb on a slide.

## Decision

- **Actions:** on the current slide in Preview (a small toolbar under the canvas, not on the slide itself) and in the slide list's context menu:
  - **Shorter:** fewer words, same point.
  - **Make it visual:** turn text into the best widget.
  - **Split in two:** two slides, one idea each.
  - **Stronger headline:** state the point, with the key phrase in bold.
  - **Try another widget**
- **Local and signed in:** send the action, the full presentation (for context) and the slide's Markdown to the chat route in a new "slide" mode. The model returns only the replacement slide or slides inside `<slides>` tags. The client splices them in place of the original, then parses and reviews; on a parse error it retries once with the error, as the chat already does. While it runs, the slide shows a quiet working state and the other slides stay usable.
- **Hosted:** the action copies a slide-scoped prompt (the format rules, the slide's Markdown, the action, and "return only the slide"). A small dialog with a textarea says "Paste the new slide here". `paste-anywhere` must not grab that paste, since the dialog's textarea has focus.
- **Undo:** keep the last 20 versions of each presentation in memory, plus the last 5 in localStorage under their own key with a total size cap. Every AI change (chat reply, slide action) and every paste-anywhere adds a version. **Ctrl/⌘ Z** on Preview and the toast's **Undo** restore the previous version. The textarea keeps its own native undo.
- The action list and prompts live in `lib/chat-prompt.ts`. Action names live in `messages/en.json`.

## Acceptance

- [ ] Locally, Shorter on a wordy slide replaces only that slide, and every other slide's text is byte-identical.
- [ ] Split in two turns one slide into two, and the slide count grows by one.
- [ ] Undo restores the exact previous source.
- [ ] Hosted: the action copies a prompt, and pasting the answer into the dialog replaces the slide.
- [ ] Tests: splicing replacement slides by index, the undo stack cap, and the slide-mode prompt builder.

## Out of scope

Free-text instructions per slide (the chat covers that), and any manual layout control.
