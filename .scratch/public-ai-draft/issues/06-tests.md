Status: resolved
Blocked by: 05

# T06 – Backend tests

Write the test suite for the free-draft backend. Drive everything through the route's request-to-outcome contract using in-memory stubs for the provider and gate.

## Scope

Create `app/api/ai-draft/route.test.ts` (or `lib/ai-draft/generate.test.ts` if the test author prefers to test the boundary directly).

### What to test

Per spec Testing Decisions:

**Input validation (no durable counter change, no provider call)**

- Empty brief → 400
- Brief over 1500 chars → 400
- Non-JSON body → 400 / 415
- Missing `brief` field → 400

**Gate outcomes (no provider call)**

- Feature disabled (`AI_DRAFT_ENABLED = false`) → `{ outcome: "limit", reason: "disabled" }`
- No client IP (missing x-forwarded-for) → `{ outcome: "limit", reason: "disabled" }` (or similar limit)
- Per-hash already used → `{ outcome: "limit", reason: "already-used" }`
- Daily global cap reached → `{ outcome: "limit", reason: "capacity" }`
- Monthly budget exhausted → `{ outcome: "limit", reason: "budget" }`
- Gate Redis failure → fails closed, returns provider-failure, no provider call

**Generation outcomes**

- Valid first attempt → `{ outcome: "presentation", source: "..." }` (parse confirms renderable)
- Invalid first attempt + valid repair → `{ outcome: "presentation", source: "..." }` (at most 2 provider calls total)
- Invalid first attempt + invalid repair → `{ outcome: "invalid-output" }` (at most 2 provider calls)
- Provider timeout/abort → `{ outcome: "provider-failure" }`, no repair call
- Provider error → `{ outcome: "provider-failure" }`, no repair call

**Output sanitisation**

- Model output containing `https://example.com` → `{ outcome: "invalid-output" }`, no repair
- Model output containing `![alt](img.png)` → `{ outcome: "invalid-output" }`, no repair

**Credential and content leaks**

- Response body must not contain ANTHROPIC_API_KEY, UPSTASH_REDIS_REST_TOKEN, or IP_HASH_SALT values
- Response body must not contain the brief text
- Response body must not contain the raw IP string

**Concurrency (unit-level)**

- Assert the gate call is made before any provider call
- Assert at most 2 provider calls total across any outcome path

## Notes

- Stub `lib/ai-draft/gate.ts` and `lib/ai-draft/provider.ts` with vi.mock or dependency injection.
- Use the real `parsePresentation` from `lib/presentation` as the oracle for renderable output.
- Build valid test presentation Markdown using the real parser to ensure test fixtures are accurate.
- Run `pnpm check` at the end to verify no type errors, lint issues, or unused exports.

## Spec reference

`.scratch/public-ai-draft/spec.md` — Testing Decisions section in full.

## Answer

Created `app/api/ai-draft/route.test.ts` with 19 tests across 6 groups:
input validation, feature disabled, gate outcomes, generation outcomes, Cache-Control header, and credential leak check.

Mocked `@/lib/ai-draft` with a getter for `AI_DRAFT_ENABLED` (re-reads `process.env.AI_DRAFT_ENABLED` at call time) to work around the module-level constant. This avoids `vi.resetModules()` complexity.

Commit: f9c9b4e — all 276 tests pass, `pnpm check` clean.
