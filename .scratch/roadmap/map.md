# Roadmap: October 2026

Status: ready-for-agent
Source: product review, https://claude.ai/artifact/ECbLVbcVqK3FFTDgJBREZm

These are the 13 ideas Evgenii picked from the review, each with its own spec. They are ordered into three tracks that can run side by side. Inside a track, finish each step before starting the next.

## Tracks

| Track                | Order | Spec                                                                  | Size | Blocked by               |
| -------------------- | ----- | --------------------------------------------------------------------- | ---- | ------------------------ |
| A · Look and sharing | 1     | [settings-in-front-matter](../settings-in-front-matter/spec.md) (bug) | S    | none                     |
|                      | 2     | [share-link](../share-link/spec.md)                                   | M    | settings-in-front-matter |
|                      | 3     | [skill-share-link](../skill-share-link/spec.md)                       | S    | share-link               |
|                      | 3     | [made-with-link](../made-with-link/spec.md)                           | S    | share-link               |
| B · Editor and AI    | 1     | [live-editing](../live-editing/spec.md)                               | M    | none                     |
|                      | 2     | [paste-anywhere](../paste-anywhere/spec.md)                           | S    | live-editing             |
|                      | 3     | [start-from-the-talk](../start-from-the-talk/spec.md)                 | M    | paste-anywhere           |
|                      | 4     | [slide-ai-actions](../slide-ai-actions/spec.md)                       | M    | start-from-the-talk      |
| C · Independent      | any   | [presenting-basics](../presenting-basics/spec.md)                     | S    | none                     |
|                      | any   | [pdf-handout](../pdf-handout/spec.md)                                 | S    | none                     |
|                      | any   | [cyrillic-fonts](../cyrillic-fonts/spec.md)                           | S    | none                     |
|                      | any   | [accessibility-pass](../accessibility-pass/spec.md)                   | S    | none                     |
|                      | any   | [offline-install](../offline-install/spec.md)                         | S    | none                     |

## Suggested first wave

Start these together; they barely overlap:

1. `settings-in-front-matter` (Track A): it is a bug, and share links need it.
2. `live-editing` (Track B): everything else in the editor builds on it.
3. `presenting-basics` (Track C): small and visible.
4. `cyrillic-fonts` (Track C): independent of everything else.

Then continue each track in order, picking up the rest of Track C as threads free up.

## Collision notes

- `components/kiosk-workspace.tsx` (1,093 lines) is touched by nearly every spec. `live-editing` should pull the editor into its own component, which shrinks later conflicts. Every parallel PR merges main before review, as usual.
- `components/slide/presentation-html.tsx` and `lib/slide-styles.ts` are shared with the skill. Touched by settings-in-front-matter, presenting-basics, pdf-handout, made-with-link, cyrillic-fonts and accessibility-pass. Each runs `pnpm build:skills` and commits the output; the parity test must pass.
- `FORMAT.md` + `public/example.md` change in settings-in-front-matter (new front matter keys) and made-with-link (`credit:`).
- The address `#`: bare numbers mean the slide (presenting-basics); `s=` means a shared presentation (share-link).

## Declined in the review

Speaker notes, presenter view, progress bar and timer. A separate "kiosk mode" is also out, since autoplay with loop already covers it (see the note in presenting-basics).
