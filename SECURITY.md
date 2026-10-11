# Security

## Reporting a problem

Please do not open a public issue for security problems. Report them privately through [GitHub's private vulnerability reporting](https://github.com/evgenius1424/kiosk-slides/security/advisories/new) instead.

Include what you found, how to reproduce it and what an attacker could do with it. You will get a reply as soon as possible, and credit in the fix if you want it.

## What matters most here

- **ChatGPT sign-in.** When you run Kiosk Slides locally, your ChatGPT tokens are stored on your own computer in `~/.config/kiosk-slides/chatgpt.json`. Anything that could leak them, or let another site or user on the machine use them, is in scope.
- **Downloaded presentations.** Exported HTML files run in other people's browsers. Presentation content that can run script or load remote content in an export is in scope.
- **The hosted site.** It has no accounts and stores presentations only in your browser, so issues there are mostly about the content a presentation can inject.

## Supported versions

Only the latest version on the `main` branch is supported.
