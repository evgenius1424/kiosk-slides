# Spec: presenting basics: slide in the address, screen stays awake, consistent wording

Status: ready-for-agent
Blocked by: (none)
Track: C (independent)

## Problem

- Reloading the site or a downloaded file jumps back to slide 1, and there is no way to link to a slide.
- Laptops and TVs dim or sleep during autoplay and long slides.
- The downloaded file says "Autoscroll on/off" (`components/slide/presentation-html.tsx:99`) while the site says "Autoplay". Its messages are hard-coded English and drift from the site's wording.

## Decision

1. **Slide number in the address.** Both the site and the downloaded file keep `#3` in the address for slide 3, using `history.replaceState` so slide changes don't fill the back button. Opening with `#3` starts on slide 3, and an out-of-range number clamps. On the site this applies to the current presentation. Switching presentations resets it to `#1`.
   - It must not collide with `#s=…` from `share-link`. Reserve bare numbers for slides, and give anything else a `key=` prefix.
2. **Screen stays awake.** Request a Screen Wake Lock while presenting full screen or while autoplay runs. Release it when both stop. Re-request it on `visibilitychange` when the page comes back, and fail silently where it isn't supported. Do this on the site and in the downloaded file.
3. **One set of words.** The downloaded file says "Autoplay on/off", "Screen-share safe on/off" and "End of presentation", matching `messages/en.json`. These live in one shared constant in `lib/player.ts` (the renderer stays English by convention). The site reads its own catalog, and a test checks that the two match.

## Acceptance

- [ ] Reload on slide 5 returns to slide 5 on the site and in a downloaded file.
- [ ] Opening `…/presentation.html#7` starts on slide 7.
- [ ] While autoplay runs, the screen doesn't dim (check by hand on a laptop; the unit test stubs `navigator.wakeLock`).
- [ ] No "Autoscroll" anywhere (`rg -i autoscroll` is empty).
- [ ] The parity test still passes, and `pnpm build:skills` output is committed.

## Out of scope

Progress bars, timers and presenter views. Evgenii declined them.

## Note: is "kiosk mode" just autoplay?

Mostly, yes. Autoplay with loop already runs a screen unattended. The two gaps are the screen sleeping, fixed here, and autoplay staying paused after someone taps the screen. If unattended screens become a real use, a follow-up could resume autoplay after a minute of no input. It isn't part of this spec.
