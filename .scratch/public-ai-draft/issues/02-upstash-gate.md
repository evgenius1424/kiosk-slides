Status: ready-for-agent
Blocked by: 01

# T02 – Upstash Redis gate

Implement the durable admission gate using Upstash Redis via its HTTPS REST interface. This is the atomic control that checks all four admission rules in a single operation.

## Scope

Create `lib/ai-draft/gate.ts`:

Install `@upstash/redis` via pnpm before implementing.

Implement `admitRequest(ipHashInput: string | null): Promise<DraftOutcome | null>`:
- `null` return means admitted (caller proceeds to provider)
- A `DraftOutcome` with `kind: "limit"` return means rejected (caller returns that outcome)
- Fail closed: if Redis is unavailable, return `{ kind: "provider-failure" }` (never call provider)

The gate must check all four controls atomically:
1. **Remote kill switch** – Redis key `ai-draft:enabled` must equal `"1"` (if missing or `"0"`, return `{ kind: "limit", reason: "disabled" }`)
2. **Per-hash limit** – Redis key `ai-draft:hash:{hash}` must be absent (SET NX, TTL 86400); if already set, return `{ kind: "limit", reason: "already-used" }`
3. **Daily global cap** – Redis key `ai-draft:daily:{UTC-date}` INCR must be ≤ DAILY_GLOBAL_LIMIT (20); if exceeded, DECR and return `{ kind: "limit", reason: "capacity" }`
4. **Monthly budget reservation** – Redis key `ai-draft:monthly:{UTC-year-month}` INCR must be ≤ MONTHLY_BUDGET_USD * 100 (800 cents); if exceeded, DECR and return `{ kind: "limit", reason: "budget" }`

Key expiry:
- Per-hash key: 86400 seconds
- Daily key: 90000 seconds (25 h, so it expires the next UTC day)
- Monthly key: 33 days (2851200 seconds)

If `ipHashInput` is `null` or empty, return `{ kind: "limit", reason: "disabled" }` without touching Redis.

Hash the input with SHA-256 using `IP_HASH_SALT` from config: `createHash('sha256').update(salt + ':' + ip).digest('hex').slice(0, 32)`.

Also export `releaseReservation()` – a no-op for now per spec ("do not refund after provider call starts"). The spec says "retain the reservation even if the result fails", so release is intentionally absent.

Export `setRemoteEnabled(enabled: boolean)` for smoke-test/admin use only – sets the Redis key.

## Notes
- Use `@upstash/redis` SDK (it uses HTTPS REST internally, matching spec requirement).
- No streaming, simple async/await.
- Use a Lua script or pipeline to make the admission check atomic.
- All Redis errors must be caught; gate fails closed.

## Spec reference
`.scratch/public-ai-draft/spec.md` — Implementation Decisions on the gate, counters, fail-closed behaviour.
