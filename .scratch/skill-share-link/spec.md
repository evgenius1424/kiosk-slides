# Spec: the skill hands back a share link

Status: ready-for-agent
Blocked by: share-link
Track: A (look and sharing), step 3

## Problem

The `kiosk-slides` skill writes a `.md` and an `.html` file. Someone using Claude has no quick way to open the result on a phone, a TV or the site.

## Decision

- `skills/render.ts` uses the same `lib/share.ts` encoder, so the link is byte-identical to the site's. After rendering, it prints one line: `Open in your browser: https://…/#s=…`.
- Print it only when the link fits the size limit from `share-link`. Otherwise print nothing extra; the HTML file is still the result.
- Add `--no-link` to turn it off.
- `SKILL.md` tells the agent to give the person that link alongside the files, in one sentence, and never to shorten it with a third-party service.
- The public site URL is baked in at `pnpm build:skills` time, from the same setting as `share-link`.

## Acceptance

- [ ] `node scripts/render.mjs example.md` prints a link that opens the same slides on the site.
- [ ] A test asserts the skill's link equals the site encoder's link for the example.
- [ ] `pnpm build:skills` output is committed; CI's freshness check passes.
