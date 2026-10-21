import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey, MAX_SLIDES, MODEL_ID } from "./config";

export type ProviderResult =
  | { kind: "ok"; text: string; inputTokens: number; outputTokens: number }
  | { kind: "refused" }
  | { kind: "error"; message: string };

const SYSTEM_PROMPT = `You create presentations for Kiosk Slides. Reply with ONLY the presentation Markdown inside <presentation></presentation> tags. No other text outside the tags.

Rules:
- At most ${MAX_SLIDES} slides (separated by ---)
- Every slide needs a settings comment: <!-- title: ... | label: ... | footer: ... -->
- Follow the Kiosk Slides Markdown format exactly
- Do NOT include any http:// or https:// URLs, external image links, or HTML tags
- Each slide starts with a # heading`;

export async function generateDraft(
  brief: string,
  signal: AbortSignal,
): Promise<ProviderResult> {
  return callApi(
    `Create a presentation about: ${brief}`,
    signal,
  );
}

export async function repairDraft(
  originalText: string,
  signal: AbortSignal,
): Promise<ProviderResult> {
  return callApi(
    `The presentation was invalid. Reply with ONLY the complete corrected presentation Markdown inside <presentation></presentation> tags. Previous attempt:\n${originalText}`,
    signal,
  );
}

async function callApi(
  userMessage: string,
  signal: AbortSignal,
): Promise<ProviderResult> {
  const client = new Anthropic({ apiKey: getAnthropicApiKey() });
  try {
    const response = await client.messages.create(
      {
        model: MODEL_ID,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      },
      { signal },
    );

    if (response.stop_reason === "max_tokens") {
      return { kind: "error", message: "output truncated" };
    }

    const block = response.content[0];
    if (!block || block.type !== "text") {
      return { kind: "error", message: "unexpected response format" };
    }

    return {
      kind: "ok",
      text: block.text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (err) {
    if (signal.aborted) {
      return { kind: "error", message: "cancelled" };
    }
    if (err instanceof Anthropic.APIError && err.status >= 400 && err.status < 500) {
      return { kind: "refused" };
    }
    return { kind: "error", message: (err as Error).message };
  }
}
