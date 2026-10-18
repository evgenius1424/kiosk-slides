# Spec: paste a presentation anywhere

Status: ready-for-agent
Blocked by: live-editing
Track: B (editor), step 2

## Problem

Getting slides from another AI chat in takes several steps: Edit tab, select all, paste, then (before `live-editing`) Update slides. It also overwrites the open presentation, which people may not expect.

## Decision

- Listen for `paste` on the page when focus is not in an input, textarea or the editor.
- If the pasted text looks like a presentation (front matter, or at least one `# ` heading), strip one surrounding Markdown code fence if present (AI chats often wrap it), run `formatPresentation`, and **create a new presentation** named from its `title:`, falling back to "Untitled presentation". Select it and go to Preview.
- Toast: "Pasted as “{name}”" with an **Undo** action that deletes the new presentation and goes back to the previous one.
- If it doesn't parse, still create it, then open Edit on it with the error showing (from `live-editing`), so the person can fix it or paste the error back to their AI.
- Text that isn't a presentation (no heading, a URL, a short phrase) is ignored, with no toast.
- **Exception:** the blank starter presentation ("Start with one clear idea") is replaced instead of piling up untitled copies, matching how the ChatGPT chat already treats it.
- Pasting inside Edit keeps working as normal text editing.

## Acceptance

- [ ] Copy a ```markdown block from any AI chat, press Ctrl/⌘ V on Preview, and a new presentation opens.
- [ ] Undo removes it and returns to the presentation that was open.
- [ ] Pasting a broken presentation opens Edit with its `Line N:` error.
- [ ] Pasting plain words does nothing.
- [ ] Unit tests cover the "looks like a presentation" check and fence stripping.

## Out of scope

Dropping or opening `.md` files. File import was removed on purpose in PR #10.
