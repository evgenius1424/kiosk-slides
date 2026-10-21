Status: ready-for-agent
Blocked by: 02, 03

# T04 – Free-draft generation boundary

Orchestrate the gate, provider, parser validation, repair attempt, and output sanitisation into a single typed boundary.

## Scope

Create `lib/ai-draft/generate.ts`:

Export `generateFreeDraft(brief: string, clientIp: string | null, signal: AbortSignal): Promise<DraftOutcome>`.

Algorithm:
1. Call `admitRequest(clientIp)`. If it returns a non-null outcome, return that outcome immediately (no provider call).
2. Call `generateDraft(brief, signal)`.
   - If `{ kind: "refused" }` or `{ kind: "error" }`, record aggregate counter and return `{ kind: "provider-failure" }`.
   - **After a provider call begins, the reservation is retained regardless of outcome** (per spec).
3. Extract the presentation from the result text: find text between `<presentation>` and `</presentation>`.
   - If the tags are missing, treat as invalid output.
4. Call `sanitiseOutput(source)` to reject external links/images (see below).
   - If sanitisation fails, treat as invalid output (no repair).
5. Call `parsePresentation(source)` from `lib/presentation`.
   - If it throws, this is attempt 1 invalid. Proceed to step 6 (repair).
   - If it parses and the slide count exceeds MAX_SLIDES, treat as invalid output (no repair).
   - If it parses cleanly, record success and return `{ kind: "presentation", source }`.
6. **One repair attempt**: call `repairDraft(text, signal)` (see provider.ts or a helper here).
   - The repair prompt asks only for valid presentation Markdown.
   - Extract, sanitise, and parse the repair result.
   - If valid, record success and return `{ kind: "presentation", source }`.
   - Otherwise, record invalid-output and return `{ kind: "invalid-output" }`.
   - **No second repair**: the route never attempts more than 2 provider calls total.

Sanitisation (`sanitiseOutput(source: string): string | null`):
- Scan for `http://` or `https://` patterns anywhere in the text.
- Scan for `![` (image widget syntax).
- If either is present, return `null` (rejected).
- Otherwise return the source unchanged.

Anonymous aggregate counters (record only counts, no content):
- `admitted` – gate returned null
- `blocked` – gate returned a limit outcome
- `provider-failed` – provider returned error or refused
- `invalid-output` – parser rejected after all attempts
- `success` – presentation returned
- Log these to `console.log` as a JSON object `{ event: "ai-draft", outcome: "..." }` for now (no Redis counter yet – deferred to later, counters in Redis are in T02 scope for admission only)

## Spec reference
`.scratch/public-ai-draft/spec.md` — Implementation Decisions on boundary, repair, sanitisation, and counters.
