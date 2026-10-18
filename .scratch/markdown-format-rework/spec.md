# Spec: Rework the deck markdown format onto real GFM markdown

Status: ready-for-agent

## Problem Statement

Decks are authored in a format that only looks like markdown at a glance. Underneath, slide separation, per-slide metadata, and every supporting widget (before/after, flow, metric) are driven by a custom `:::name` fenced-directive syntax that no markdown renderer or reader understands, enforced by a hand-rolled regex parser. This means:

- A `.md` deck file doesn't actually render sensibly as markdown outside this app — the `:::` blocks just show up as literal text clutter.
- There's no table, chart, or button component at all, even though these are common, expected slide content.
- The parser is a single long function doing line-by-line regex matching with no AST, which makes adding new components error-prone and the validation error messages hard to keep consistent.
- The author wants to eventually publish an AI-authoring skill that generates these decks. A format built from non-standard custom syntax is harder for an LLM to learn and self-correct against than one built from markdown constructs it already understands (tables, lists, links, emphasis) plus one small, uniform annotation convention.

## Solution

Rebuild the format so that plain, real markdown carries the primary meaning, and a small, uniform HTML-comment annotation convention is used only where the plain markdown shape is genuinely ambiguous (e.g. "is this table data or a chart?"). Concretely:

- Parse with a real GFM-aware markdown parser (`remark` + `remark-gfm`) instead of hand-rolled regex, producing an AST that both parsing and validation operate on.
- Replace the `:::meta` directive with a single HTML comment placed right after a slide's `---` separator, holding the same per-slide chrome fields (title/label/footer/layout/duration).
- Replace all other `:::name` directives with components that are detected directly from native markdown shapes (tables, bullet lists, links) wherever the shape is unambiguous, or disambiguated with one short annotation comment (`<!-- type -->` / `<!-- type: key=value -->`) directly above the block when it isn't.
- Add three new first-class components that didn't exist before: table, chart, and buttons.
- Redefine the flow component as a plain bullet list of arrow-chains (`A -> B -> C`), where boxes with identical text across different bullets automatically merge — giving a simple boxes-and-arrows diagram from plain text, with no bracket/field syntax.
- Keep the existing "exactly one supporting widget per slide" rule and the general "small, glanceable, fits-on-a-kiosk-screen" caps philosophy, extended to the new components.
- Move the internal `Slide` type from an untyped `values: Record<string,string>` bag into a discriminated union with real per-component payload types.
- This is a clean, big-bang replacement — no dual-format support for the old `:::` syntax. There's nothing persisted to migrate besides `public/example.md` and the live editor's in-memory buffer.
- Produce a standalone `FORMAT.md` as the canonical spec for the format, and keep it, `parseDeck`, the AI chat route's format-guide prompt, and `public/example.md` in lockstep.

## User Stories

1. As a deck author, I want to write a slide's heading and body as a plain `#` heading and paragraph, so that the file still reads naturally as markdown.
2. As a deck author, I want a flat numbered list to become a "steps" widget automatically, so that I don't need any extra syntax for the most common supporting content.
3. As a deck author, I want a fenced code block to become the "code" widget automatically, so that code slides need nothing beyond standard markdown.
4. As a deck author, I want a markdown image to become the "image" widget automatically, so that images need no extra annotation.
5. As a deck author, I want to write a plain GFM table and have it render as a real table, so that tabular data doesn't require any special syntax.
6. As a deck author, I want a two-column table headed `Before | After` to automatically become the before/after widget, so that this common comparison needs no annotation at all.
7. As a deck author, I want to turn any small table into a bar or line chart by adding one short comment above it, so that I can visualize a trend or comparison without learning a separate chart syntax.
8. As a deck author, I want to omit the `x`/`y` columns in a chart annotation and have the first column default to labels, so that the common case stays terse.
9. As a deck author, I want to write a bold value line followed by a caption line, annotated with `<!-- metric -->`, so that I can show a big-number stat without inventing a new data shape.
10. As a deck author, I want to write a flow as a plain bulleted list of `Box -> Box -> Box` chains, so that a boxes-and-arrows diagram reads like a plain description even unrendered.
11. As a deck author, I want two flow bullets that share identical box text to automatically merge at that box, so that converging flows ("two inputs become one output") don't need special merge syntax.
12. As a deck author, I want two flow bullets with no shared text to render as two independent parallel lines, so that unrelated flows can sit on one slide without forcing a fake connection.
13. As a deck author, I want to add a short bulleted list of markdown links annotated `<!-- buttons -->`, so that I can put a "view the repo" / "see the product" action on a slide.
14. As a deck author, I want every component's annotation comment to follow one `<!-- type -->` / `<!-- type: key=value key=value -->` grammar, so that I only have to remember one pattern across flow, chart, metric, and buttons.
15. As a deck author, I want per-slide chrome (title/label/footer/layout/duration) to live in one HTML comment right after the `---` separator, so that slide metadata doesn't need a `:::meta` fence.
16. As a deck author, I want the deck-level frontmatter (title/theme/duration/loop) to stay as plain YAML-ish front matter, so that the one piece of pre-existing "real" config syntax doesn't change.
17. As a deck author, I want a slide to still allow at most one supporting widget, so that the "one big idea per slide" design intent is preserved.
18. As a deck author, I want clear, line-numbered error messages when I break a rule (too many buttons, wrong chart type, more than one widget, etc.), so that I can fix the deck myself without reading the parser source.
19. As a kiosk presenter, I want every new component (table, chart, buttons, flow) to stay small enough to read from across a room, so that the kiosk display philosophy isn't broken by richer content.
20. As the AI chat feature's deck generator, I want the same `parseDeck` function to be the single source of truth for validity, so that the existing generate → validate → retry-on-error loop keeps working unchanged.
21. As the AI chat feature's deck generator, I want the format's rules restated in a dedicated `FORMAT.md`, so that the system prompt can be built from one authoritative document instead of a hand-maintained prose constant.
22. As the project maintainer, I want the internal `Slide` type to be a discriminated union with typed per-component payloads, so that adding or changing a component is a type-checked change instead of a change to untyped string maps.
23. As the project maintainer, I want `public/example.md` rewritten to demonstrate every component at least once in the new grammar, so that it continues to double as the human spec-by-example and the AI few-shot example.
24. As the project maintainer, I want no leftover support for the old `:::` directive syntax, so that the parser and the spec don't carry two formats at once.
25. As a future AI-authoring-skill developer, I want the format's annotation grammar to be uniform and its caps to be small and explicit, so that a model generating decks has a narrow, learnable, self-correctable target.

## Implementation Decisions

- **Parsing library**: adopt `remark` + `remark-gfm` (mdast) as new dependencies. `parseDeck(source: string): Deck` keeps its exact existing signature and contract (returns a typed `Deck`, or throws an `Error` with a `Line N: ...`-prefixed message) — callers (`components/kiosk-workspace.tsx`, `app/api/chat/route.ts`) are unchanged. Internally, parsing shifts from regex/line-splitting to walking the mdast tree.
- **Deck-level front matter**: unchanged — a `---`-fenced YAML-ish block at the top of the file with `title`, `theme` (`room-dark`/`room-light`), `duration: Ns`, `loop: true|false`.
- **Slide separator**: unchanged — a bare `---` line (outside fences) starts a new slide.
- **Slide-level `Slide` type**: becomes a discriminated union on a `kind` field (naming TBD at implementation time, e.g. `kind: 'message' | 'steps' | 'code' | 'image' | 'table' | 'before-after' | 'chart' | 'metric' | 'flow' | 'buttons'`), each variant carrying shared chrome fields (`title`, `label`, `footer`, `heading`, `body`, `layout`, `duration?`) plus a typed, component-specific payload (e.g. `TableSlide.rows: string[][]`, `ButtonsSlide.buttons: { label: string; url: string }[]`, `FlowSlide.lines: string[][]` as box-chains, `ChartSlide.type: 'bar'|'line'`, `ChartSlide.series`, etc.) instead of the current flat `values: Record<string,string>` / `items: string[]`.
- **Slide chrome config**: one HTML comment immediately after the slide's `---` separator and before its `#` heading, with multiline `key: value` lines for `title`, `label`, `footer`, `layout` (`auto`/`stacked`/`split-left`, unchanged), `duration` (`Ns`, unchanged). This comment is optional per slide (chrome fields default the same way they do today when omitted). This replaces `:::meta` entirely.
- **Uniform block annotation grammar**: `<!-- type -->` (no args) or `<!-- type: key=value key=value -->` (space-separated `key=value` pairs), placed on the line directly above the markdown block it annotates. Recognized `type` keywords: `flow`, `metric`, `chart`, `buttons`. `table`, `before-after`, `steps`, `code`, and `image` are never annotated — they're detected purely from their native markdown shape.
- **One-widget-per-slide rule**: unchanged in spirit — a slide may produce at most one of {steps, code, image, table, before-after, chart, metric, flow, buttons}; detecting more than one in a single slide is a validation error, same as today's `widgets > 1` check.
- **Component detection/mapping rules**:
  - _Steps_: a single flat (non-nested) GFM ordered list `1. 2. 3.` → steps widget, same as today. No semantic meaning is assigned to nested list depth; a nested sub-list under a step is a validation error ("flatten the list — nesting isn't supported") rather than silently given meaning, to keep the grammar from growing an implicit second dimension.
  - _Code_: a fenced code block → code widget. Language comes from the fence info string. Content capped at 12 lines (unchanged from today).
  - _Image_: a markdown image `![alt](src "caption")` → image widget. `src` validation unchanged (HTTPS URL, `/images/`-relative path, or embedded base64 data URI).
  - _Table_: any GFM table with no `<!-- chart -->` comment immediately above it, and whose header row is not exactly `Before | After` → table widget, storing the header + body rows. Capped at 5 columns × 6 rows.
  - _Before/After_: a GFM table whose header row is exactly `Before | After` (case-insensitive) → before-after widget, using the first body row's two cells as `before`/`after`. A second body row is a validation error ("before/after is a single comparison — use a plain table for more rows").
  - _Chart_: a GFM table immediately preceded by `<!-- chart: type=bar x=<col> y=<col> -->` → chart widget. `type` is required and must be `bar` or `line` (no pie/donut in v1). `x`/`y` are optional; when omitted, the first column is treated as labels and every remaining column as a data series. Same 5×6 cap as table.
  - _Metric_: a bold line (`**value**`) immediately followed by a plain text line, preceded by `<!-- metric -->` → metric widget with `{ value, caption }`. No trend/delta field in v1.
  - _Flow_: a bullet list preceded by `<!-- flow -->`, where each top-level bullet is one arrow-chain written as `Box -> Box -> Box`. Boxes with exactly matching text across different bullets are the same node (producing convergence); bullets sharing no text render as independent parallel lines. Capped at 2 bullets × 4 boxes each (8 distinct boxes max).
  - _Buttons_: a bullet list of markdown links `[Label](url)` preceded by `<!-- buttons -->` → buttons widget, `{ buttons: { label, url }[] }`. Capped at 3. `url` must be an external `https://` URL (no in-deck/slide-jump navigation in v1).
  - The `==highlight==` inline span inside the `#` heading is unchanged.
- **Validation error messages**: keep the existing `Line N: <message>` convention (consumed both by the editor's error display and by the AI chat route's retry loop, which feeds the message back to the model). New rules get equally specific messages (e.g. "A chart needs type=bar or type=line.", "Use at most 3 buttons.", "A flow supports at most 2 lines of up to 4 boxes each.").
- **`app/api/chat/route.ts`**: the `FORMAT_GUIDE` constant is rewritten for the new grammar and should be kept in lockstep with (ideally generated from, or at minimum reviewed against) the new `FORMAT.md`. `extractDeck`'s behavior — call `parseDeck`, retry up to `MAX_ATTEMPTS` on thrown errors — is unchanged.
- **`public/example.md`**: fully rewritten in the new grammar, demonstrating every component at least once (message, steps, code, image, table, before-after, chart, metric, flow, buttons).
- **`FORMAT.md`** (new file, repo root): the canonical, human- and AI-readable spec — grammar, the uniform annotation convention, the full component table with detection rules and caps, and example snippets. This is the document a future AI-authoring skill should point at as its one source of truth.
- **`components/slide.tsx` (`SlideView`)**: extended with render branches for the new `table`, `chart`, and `buttons` kinds, and a reworked render branch for `flow` (boxes-and-arrows layout, replacing the old starts+bullet-steps layout). `before-after`, `metric`, `steps`, `code`, and `image` rendering stay visually as they are today, just reading from the new typed payload shape instead of `values`/`items`. Chart rendering (bar/line, ≤6 points, ≤5 series) can be a small hand-rolled inline SVG/CSS renderer — the data volume is small enough that pulling in a charting library is not obviously justified, but that choice is left open for implementation time if a hand-rolled renderer proves awkward.

## Testing Decisions

- The repo currently has no test runner configured (no test script in `package.json`, no `*.test.*` files). This spec includes adding one — `vitest` is the natural fit for this TS/Next.js project and needs no DOM for the primary seam.
- **Primary seam: `parseDeck`**. It's a pure function (string in, typed `Deck` out or a thrown `Error`), already the one chokepoint both the editor and the AI validation route depend on. Tests should feed representative markdown snippets and assert either the exact resulting typed `Deck`/`Slide` shape (happy path, one test per component: steps, code, image, table, before-after, chart, metric, flow, buttons, plus deck-level front matter and slide-chrome-comment parsing) or the exact thrown error message (unhappy path: too many widgets on one slide, chart with no/invalid `type`, more than 3 buttons, more than 2×4 flow boxes, nested steps list, before-after with extra rows, missing heading, etc.). Assert on parsed output and error text — not on internal AST traversal.
- **Secondary seam: `SlideView`**. Component-level render tests (React Testing Library) feeding a hand-built typed `Slide` value for each new/changed kind (table, chart, buttons, flow) and asserting the expected rendered structure (row/column counts, button count and hrefs, box/arrow count) — not re-testing markdown parsing here.
- **Regression guard**: a test that runs `parseDeck` against the real `public/example.md` and asserts it parses successfully and contains at least one slide of each component kind — catches drift between the example file, the spec, and the parser as any of the three changes over time.
- No existing tests in the repo to use as direct prior art; this introduces the first test suite and establishes the `parseDeck`-as-primary-seam pattern for any future component additions.

## Out of Scope

- Backward compatibility with the old `:::meta` / `:::before-after` / `:::flow` / `:::metric` directive syntax — this is a clean, one-time replacement.
- In-deck navigation buttons (jumping to another slide) — buttons are external-URL-only in v1.
- Chart types beyond bar and line (no pie/donut/etc.).
- A metric trend/delta indicator.
- Any semantic meaning for nested/multi-level numbered lists.
- Publishing this spec to GitHub Issues or applying a tracker label — tracked locally in this `specs/` file per the author's instruction to use the local tracker only.
- Final confirmation of the chart-rendering approach (hand-rolled SVG vs. a small charting dependency) — left to implementation time.

## Further Notes

- This is a solo, pre-publish project. There are no other deck files to migrate besides `public/example.md`, and no persisted deck storage beyond the live editor's in-memory buffer — so the "big bang" replacement has no real migration cost.
- The author's longer-term goal is publishing an AI-authoring skill that generates decks in this format. The uniform `<!-- type: key=value -->` annotation grammar, the small per-component caps, and the discriminated-union typed model (which yields precise validator error messages) were all chosen specifically to make the format a narrow, learnable, self-correctable target for an LLM — this should stay the guiding principle if further components are added later.
- `FORMAT.md` is intended to become the one document both this parser's maintainers and a future authoring skill treat as ground truth, rather than letting the spec live only as prose inside `app/api/chat/route.ts`.
