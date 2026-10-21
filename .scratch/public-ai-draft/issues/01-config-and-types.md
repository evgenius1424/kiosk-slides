Status: resolved

# T01 – Config and domain types

Define the typed configuration accessors and domain types for the free-draft feature. No external dependencies are introduced here; everything is server-only TypeScript.

## Scope

Create `lib/ai-draft/config.ts`:

- Export `AI_DRAFT_ENABLED` (reads `process.env.AI_DRAFT_ENABLED`; defaults to `false`; string `"true"` enables)
- Export `ANTHROPIC_API_KEY` accessor (reads `process.env.ANTHROPIC_API_KEY`; throws if accessed when missing)
- Export `UPSTASH_URL` accessor (reads `process.env.UPSTASH_REDIS_REST_URL`)
- Export `UPSTASH_TOKEN` accessor (reads `process.env.UPSTASH_REDIS_REST_TOKEN`)
- Export `IP_HASH_SALT` accessor (reads `process.env.IP_HASH_SALT`)
- Export constants: `MAX_BRIEF_LENGTH = 1500`, `MAX_SLIDES = 10`, `DAILY_PER_HASH_LIMIT = 1`, `DAILY_GLOBAL_LIMIT = 20`, `MONTHLY_BUDGET_USD = 8`, `MODEL_ID = "claude-haiku-4-5"` (pinned)
- Export the `DraftOutcome` discriminated union type:
  ```ts
  type DraftOutcome =
    | { kind: 'presentation'; source: string }
    | { kind: 'limit'; reason: 'disabled' | 'already-used' | 'capacity' | 'budget' }
    | { kind: 'invalid-output' }
    | { kind: 'provider-failure' }
  ```

## Notes

- All accessors must be server-side only (never imported by client code).
- Keep accessors as functions, not module-level reads, so tests can set env vars before import.
- No test file needed for this ticket (config is tested through higher-level tests).

## Spec reference

`.scratch/public-ai-draft/spec.md` — Implementation Decisions bullets on credentials, model version, and configuration.

## Answer

Created `lib/ai-draft/config.ts` with:

- `AI_DRAFT_ENABLED` boolean constant
- `getAnthropicApiKey()`, `getUpstashUrl()`, `getUpstashToken()`, `getIpHashSalt()` accessor functions
- Constants: `MAX_BRIEF_LENGTH`, `MAX_SLIDES`, `DAILY_PER_HASH_LIMIT`, `DAILY_GLOBAL_LIMIT`, `MONTHLY_BUDGET_CENTS` (800), `MODEL_ID`
- `DraftOutcome` discriminated union type

Created `lib/ai-draft/index.ts` re-exporting all public surface.

Added `lib/ai-draft/**` to knip ignore list (T02–T06 will import these, at which point the ignore entry can be removed).

Commit: 8b25c16
