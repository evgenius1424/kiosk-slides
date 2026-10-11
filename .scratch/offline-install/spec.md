# Spec: installable and offline

Status: done
Blocked by: (none). Ideally lands after cyrillic-fonts so new font files are cached from the start, but a build-time asset list makes the order not matter.
Track: C (independent)

## Problem

Everything except Ask AI already runs in the browser, but the site needs a connection to load. Venue Wi-Fi fails at the worst moment.

## Decision

- Add a web app manifest (name, icons from `public/`, `display: standalone`, theme colors), so browsers offer Install.
- Add a service worker that precaches the app shell, JS, CSS, fonts and `public/images`, using a list generated at build time so it stays correct. Never cache `/api/*` or `/auth/*`.
- Offline behavior:
  - Everything works with the presentations in local storage: Preview, Edit, Present, Download, PDF and Share (making a link).
  - Ask AI shows "Ask AI needs a connection".
  - Opening a share link works offline once the site has been cached.
- **Updates:** a new version installs in the background and applies on the next visit. No reload prompts in the middle of a talk.
- Check the guide in `node_modules/next/dist/docs/` for this Next version's manifest and service worker conventions before writing it.

## Acceptance

- [x] After one visit, with the network off (DevTools Offline), the site loads, presents and downloads.
- [x] Chrome offers Install, and the installed app opens to the last presentation.
- [x] Ask AI offline shows the message, not a broken spinner.
- [x] `/api/chat` is never served from cache.
