import Anthropic from '@anthropic-ai/sdk'

export const MODEL_ID = 'claude-haiku-5-5'
export const RESERVE_CENTS_PER_DRAFT = 1

const MAX_OUTPUT_TOKENS = 3000
const TIMEOUT_MS = 45_000

export type Turn = { role: 'user' | 'assistant'; content: string }
export type Reply = { text: string | null; inputTokens: number; outputTokens: number }

export async function complete(system: string, turns: Turn[], signal: AbortSignal): Promise<Reply> {
  try {
    const response = await new Anthropic({ maxRetries: 0, timeout: TIMEOUT_MS }).messages.create(
      {
        model: MODEL_ID,
        max_tokens: MAX_OUTPUT_TOKENS,
        thinking: { type: 'disabled' },
        system,
        messages: turns,
      },
      { signal },
    )
    const text = response.content.map(block => (block.type === 'text' ? block.text : '')).join('')
    return {
      text: response.stop_reason === 'end_turn' ? text : null,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }
  } catch {
    return { text: null, inputTokens: 0, outputTokens: 0 }
  }
}
