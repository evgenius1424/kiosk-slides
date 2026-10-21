import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { getAnthropicApiKey, MAX_SLIDES, MODEL_ID } from './config'

export type ProviderResult =
  | { kind: 'ok'; text: string; inputTokens: number; outputTokens: number }
  | { kind: 'refused' }
  | { kind: 'error'; message: string }

const SYSTEM_PROMPT = `You create presentations for Kiosk Slides. Reply with ONLY the presentation Markdown inside <presentation></presentation> tags. No other text outside the tags.

Rules:
- At most ${MAX_SLIDES} slides (separated by ---)
- Every slide needs a settings comment: <!-- title: ... | label: ... | footer: ... -->
- Follow the Kiosk Slides Markdown format exactly
- Do NOT include any http:// or https:// URLs, external image links, or HTML tags
- Each slide starts with a # heading`

export async function generateDraft(brief: string, signal: AbortSignal): Promise<ProviderResult> {
  return callApi(`Create a presentation about: ${brief}`, signal)
}

export async function repairDraft(
  originalText: string,
  signal: AbortSignal,
): Promise<ProviderResult> {
  return callApi(
    `The presentation was invalid. Reply with ONLY the complete corrected presentation Markdown inside <presentation></presentation> tags. Previous attempt:\n${originalText}`,
    signal,
  )
}

async function callApi(userMessage: string, signal: AbortSignal): Promise<ProviderResult> {
  const anthropic = createAnthropic({ apiKey: getAnthropicApiKey() })
  try {
    const result = await generateText({
      model: anthropic(MODEL_ID),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      maxOutputTokens: 4096,
      abortSignal: signal,
    })

    if (result.finishReason === 'length') {
      return { kind: 'error', message: 'output truncated' }
    }
    if (result.finishReason === 'content-filter') {
      return { kind: 'refused' }
    }

    return {
      kind: 'ok',
      text: result.text,
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    }
  } catch (err) {
    if (signal.aborted) {
      return { kind: 'error', message: 'cancelled' }
    }
    return { kind: 'error', message: (err as Error).message }
  }
}
