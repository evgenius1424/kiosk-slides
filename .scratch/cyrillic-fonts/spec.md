# Spec: fonts for Cyrillic text

Status: ready-for-agent
Blocked by: (none)
Track: C (independent)

## Problem

All five bundled fonts in `public/fonts/` are Latin-only subsets; none contains Cyrillic (checked by reading each font's character map). A Russian or Ukrainian heading falls back to Arial, and mixed headings switch faces mid-line. The heading-fit math (`width` in `lib/presentation/look.ts`) then also measures the wrong font. Evgenii plans a Russian UI later.

## Decision

1. **Yandex fonts:** first, check the license of Yandex's own typefaces (YS Text / YS Display). As far as we know they are not under an open license and are meant for Yandex's own products, so they can't ship in an MIT project. If that's confirmed, record it here under Comments and use the fonts below.
2. **Inter:** upstream has Cyrillic. Re-subset it with Latin plus Cyrillic, and add `unicode-range` so the Cyrillic part only downloads when it's used.
3. **Latin-only families** (Figtree, Bricolage Grotesque, Space Grotesk, Archivo Expanded): give each a Cyrillic fallback in its font stack, chosen by feel, instead of Arial. Candidates, all under the SIL Open Font License and made with Cyrillic in mind:
   - **Golos Text** (Paratype; used across Russian government services): for Figtree, Inter-like UI.
   - **Onest**: for Space Grotesk and Bricolage.
   - **Unbounded** (wide display): for Archivo Expanded.
     Ship only the Cyrillic subset of each fallback, and add their licenses to `public/fonts/LICENSE.md`.
4. **Font picker:** optionally add Golos Text as a sixth choice that is fully Cyrillic.
5. **Heading fit:** when a heading is mostly Cyrillic, use the fallback face's `width` in `headingSize`, so Extra large still fits.
6. Same font files in the site, the download and the skill: run `pnpm build:skills` and commit.

## Acceptance

- [ ] A presentation with a Russian heading renders in the chosen family's matching face in every font option. No Arial unless "Classic" is chosen.
- [ ] Latin-only presentations download no Cyrillic font files (check the network tab).
- [ ] At Extra large, a long Russian heading fits the slide.
- [ ] Parity test passes; the fonts license file lists every new font.

## Out of scope

A Russian UI translation (a later `messages/ru.json`), and right-to-left scripts.
