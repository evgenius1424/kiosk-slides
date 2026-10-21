Status: resolved
Blocked by: 04

# T05 – POST /api/ai-draft route

Add the public API route that validates the brief and delegates to the generation boundary.

## Scope

Create `app/api/ai-draft/route.ts`:

```
POST /api/ai-draft
Content-Type: application/json
{ "brief": "..." }
```

Response (200 always, outcome in body):

```ts
type RouteResponse =
  | { outcome: 'presentation'; source: string }
  | { outcome: 'limit'; reason: 'disabled' | 'already-used' | 'capacity' | 'budget' }
  | { outcome: 'invalid-output' }
  | { outcome: 'provider-failure' }
```

Error responses:

- 400 if body is not JSON or brief is missing/not a string
- 400 if brief is empty or exceeds MAX_BRIEF_LENGTH (1500 chars) – message: "brief must be 1–1500 characters"
- 415 if Content-Type is not application/json
- 503 if `AI_DRAFT_ENABLED` is false – `{ outcome: "limit", reason: "disabled" }`

Client IP extraction:

- Read `x-forwarded-for` header (Vercel sets this). Take the first comma-separated value, trimmed.
- If missing or malformed, pass `null` to `generateFreeDraft`.

Cache headers: `Cache-Control: no-store`.

## Notes

- No `checkLocalRequest` guard – this route is intentionally public (hosted visitors).
- The feature-enabled check happens at route entry AND inside the gate (belt-and-suspenders).
- Do not log brief content, IP address, or generated presentation.

## Spec reference

`.scratch/public-ai-draft/spec.md` — User Stories 1, 8, 16; Implementation Decisions on route, credentials, and IP handling.

## Answer

Implemented in `app/api/ai-draft/route.ts` (commit a12034b).

- Validates Content-Type (415), JSON body (400), and brief field (400 with "brief must be 1–1500 characters").
- Returns HTTP 200 with `{ outcome: "limit", reason: "disabled" }` when `AI_DRAFT_ENABLED` is false.
- Extracts client IP from `x-forwarded-for`, falls back to `null`.
- Delegates to `generateFreeDraft` and maps `DraftOutcome` kinds to the route response shape.
- Sets `Cache-Control: no-store` on all responses.
- Also removed unused exports (`DAILY_PER_HASH_LIMIT`, `releaseReservation`, `setRemoteEnabled`) and trimmed `index.ts` re-exports to fix knip; ran `pnpm format` to bring all `lib/ai-draft/` files into Prettier compliance.
