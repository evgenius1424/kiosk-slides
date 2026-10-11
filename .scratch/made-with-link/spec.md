# Spec: "Made with Kiosk Slides" credit

Status: ready-for-agent
Blocked by: share-link (the credit also appears in the shared view)
Track: A (look and sharing), step 3, in parallel with skill-share-link

## Problem

Every downloaded file and shared link is a chance for someone to discover the project, which matters for an open-source project. Today nothing in a download points back to the site.

## Decision

- **Never on a slide.** Slides stay clean for the room and for screen sharing.
- **Downloaded file:** the end-of-presentation notice reads "End of presentation · Made with Kiosk Slides", linking to the public site. While presenting, it shows only on the notice and doesn't stay on screen.
- **Shared view:** the "Shared presentation" bar includes "Made with Kiosk Slides" as a link to the start screen.
- **Turning it off:** Settings has a "Credit Kiosk Slides" toggle under Brand, on by default. Turning it off writes `credit: false` to the front matter, so it travels with the file and with share links.
- **Skill:** reads `credit:` and accepts `--no-credit`.
- Wording lives in `messages/en.json` for the site and in the shared English constant (from `presenting-basics`) for the download.

## Acceptance

- [ ] A download shows the credit only on the end notice, linking to the site.
- [ ] `credit: false` removes it everywhere: download, shared view and skill render.
- [ ] The parity test still passes.
