export const AI_DRAFT_ENABLED = process.env.AI_DRAFT_ENABLED === "true";

export const MAX_BRIEF_LENGTH = 1500;
export const MAX_SLIDES = 10;
export const DAILY_PER_HASH_LIMIT = 1;
export const DAILY_GLOBAL_LIMIT = 20;
export const MONTHLY_BUDGET_CENTS = 800;
export const MODEL_ID = "claude-haiku-4-5";

export type DraftOutcome =
  | { kind: "presentation"; source: string }
  | { kind: "limit"; reason: "disabled" | "already-used" | "capacity" | "budget" }
  | { kind: "invalid-output" }
  | { kind: "provider-failure" };

export function getAnthropicApiKey(): string {
  return process.env.ANTHROPIC_API_KEY ?? "";
}

export function getUpstashUrl(): string {
  return process.env.UPSTASH_REDIS_REST_URL ?? "";
}

export function getUpstashToken(): string {
  return process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
}

export function getIpHashSalt(): string {
  return process.env.IP_HASH_SALT ?? "";
}
