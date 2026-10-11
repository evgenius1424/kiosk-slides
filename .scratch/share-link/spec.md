# Spec: share by link, with a QR code

Status: ready-for-agent
Blocked by: settings-in-front-matter (so a link carries the whole look)
Track: A (look and sharing), step 2

## Problem

The only way to give someone a presentation is the downloaded HTML file. Email filters and chat apps often block or mangle `.html` attachments, and phones open them awkwardly. Evgenii wants no server and no stored data.

## Decision

The link carries the presentation itself, after the `#`, which browsers never send to a server.

- **Encoding:** `https://<site>/#s=<base64url(deflate-raw(markdown))>`.
  - Use `CompressionStream('deflate-raw')` in the browser and `zlib.deflateRawSync` in Node.
  - Put encode and decode in one module, `lib/share.ts`, so the site and the skill produce identical links (see `skill-share-link`).
  - The example presentation is about 3 KB of Markdown, which compresses to well under 2 KB of link.
  - Prefix the payload with a version letter (`#s=1…`) so the encoding can change later.
- **Size:** links up to about 16 KB are allowed. Above that, or when the presentation embeds `data:` images, Share explains that it's too big to share by link and offers Download instead.
- **QR code:** show one when the link is short enough to scan reliably (about 1,500 characters or less). Otherwise show the link only, with "Too long for a code; send the link instead." Draw it as inline SVG with a tiny MIT dependency (`uqr` or `qrcode-generator`, implementer's choice). No network calls.
- **Share button:** in the header next to Download. It opens a small panel with:
  - the link and a Copy button;
  - the QR code;
  - the line "Anyone with the link can see these slides. Nothing is uploaded."
- **Opening a link:** the site decodes it, parses it and shows the slides read-only: Preview and Present only, with no Edit or Ask AI. A bar says "Shared presentation" and offers **Keep a copy**, which adds it to the library and switches to normal mode.
  - The library is not touched until Keep a copy is pressed.
  - If an identical source is already in the library, open that one instead.
  - A broken or truncated link shows "This link is incomplete. Ask for it again." and a button to go to your own presentations.
- **Local builds:** links always point at the public site, not `127.0.0.1`. Add `NEXT_PUBLIC_SITE_URL`, falling back to the Vercel production URL, so a link made on a local run opens on the hosted site.
- **Address:** `#s=…` must coexist with the slide number from `presenting-basics`: `#s=…&3`, or the slide number is dropped while viewing a shared link. Implementer's choice; document it in `lib/share.ts`.

## Acceptance

- [ ] Share on the example produces a link that, in a fresh browser, shows the same slides with the same theme, tone, font and transition.
- [ ] The QR code scans with a phone camera and opens the presentation.
- [ ] Keep a copy adds it once; opening the same link again doesn't duplicate it.
- [ ] A truncated link shows the friendly error, not a crash.
- [ ] Round-trip tests: encode, decode and parse for the example and for a presentation with Cyrillic text.

## Out of scope

Short links, analytics, expiry, passwords and anything stored on a server.
