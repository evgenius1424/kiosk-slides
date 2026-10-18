# Spec: accessibility pass

Status: ready-for-agent
Blocked by: (none)
Track: C (independent)

## Problem

Found while using the site:

- The Settings panel doesn't close with Esc; only clicking Settings again closes it.
- Slide changes aren't announced to screen readers.
- Images can be added with empty alt text.
- The tone colors haven't been checked for contrast on the Light theme.

## Decision

- **Settings panel:** Esc closes it, focus returns to the Settings button, and clicking outside closes it. Focus moves into the panel when it opens. Check the presentation menu and Help dialog for the same behavior.
- **Announcements:** a polite live region says "Slide 3 of 11: {title}" on the site and in the downloaded file. Each slide is a labeled region. Inactive slides in the download are `inert` / `aria-hidden`.
- **Images:** `reviewPresentation` warns when an image has no alt text ("Slide 4: describe the image in its alt text"). That flows to the AI retry and the skill's `--check`. Alt text is rendered on the `<img>` as today.
- **Contrast:** check each tone as heading highlight and accent on both themes against WCAG AA for large text (3:1). Adjust Light-theme tone values that fail, keeping their hue.
- **Keyboard focus:** every control in the header, slide list and Settings has a visible focus ring.
- **Reduced motion:** already handled in `lib/player.ts`; keep it covered by a test.

## Acceptance

- [ ] Esc closes Settings and returns focus.
- [ ] VoiceOver or NVDA reads the slide number and title on each move, on the site and in a download.
- [ ] `reviewPresentation` test for missing alt text.
- [ ] A test asserts every tone meets 3:1 on both theme backgrounds.
- [ ] axe (or Playwright's accessibility snapshot) reports no serious issues on Preview, Edit and Settings.
