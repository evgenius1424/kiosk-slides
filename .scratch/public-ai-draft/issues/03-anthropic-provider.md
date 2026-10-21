Status: ready-for-agent
Blocked by: 01

# T03 – Anthropic free-draft provider

Implement the Anthropic Claude API call that generates a bounded presentation from a brief.

## Scope

Create `lib/ai-draft/provider.ts`:

Install `@anthropic-ai/sdk` via pnpm before implementing.

Export `generateDraft(brief: string, signal: AbortSignal): Promise<ProviderResult>` where:
```ts
type ProviderResult =
  | { kind: "ok"; text: string; inputTokens: number; outputTokens: number }
  | { kind: "refused" }
  | { kind: "error"; message: string }
```

Implementation:
- Use `MODEL_ID` from config (pinned `"claude-haiku-4-5"`)
- Set `max_tokens: 4096`
- Send a single user message with the compact prompt below
- If the response stops due to `stop_reason: "max_tokens"`, treat as `{ kind: "error", message: "output truncated" }`
- If the API returns a content-filtering refusal (`stop_reason: "end_turn"` but content contains a safety refusal signal), return `{ kind: "refused" }`
- On any non-2xx API error or network error, return `{ kind: "error", ... }`
- Return actual `input_usage.input_tokens` and `usage.output_tokens` for aggregate tracking

Compact prompt template (system):
```
You create presentations for Kiosk Slides. Reply with ONLY the presentation Markdown inside <presentation></presentation> tags. No other text.

Rules:
- At most MAX_SLIDES slides (separated by ---)
- Every slide needs a settings comment: <!-- title: ... | label: ... | footer: ... -->
- Follow the presentation format exactly; the parser will reject invalid output
- Do NOT include any external URLs, image links, or http/https references
- Output plain text and Markdown only; no HTML tags
```

User message: `Create a presentation about: {brief}`

## Notes
- Do NOT reuse `streamResponse` from chatgpt.ts – this is a completely separate provider.
- Use the Anthropic SDK `messages.create` (non-streaming) for simplicity.
- Pass `signal` as `AbortSignal` to the SDK fetch options.
- Keep MAX_SLIDES and the format rules aligned with config constants.

## Spec reference
`.scratch/public-ai-draft/spec.md` — Implementation Decisions on provider, model, token limits, prompt.
