export const MAX_BRIEF_LENGTH = 1500
export const MAX_SLIDES = 10

export type DraftLimit = 'disabled' | 'already-used' | 'capacity' | 'budget'
export type DraftOutcome =
  | { kind: 'presentation'; source: string }
  | { kind: 'limit'; reason: DraftLimit }
  | { kind: 'invalid-output' }
  | { kind: 'provider-failure' }

export async function requestDraft(brief: string, signal?: AbortSignal): Promise<DraftOutcome> {
  try {
    const response = await fetch('/api/ai-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief }),
      signal,
    })
    if (response.ok) return (await response.json()) as DraftOutcome
  } catch (err) {
    if (signal?.aborted) throw err
  }
  return { kind: 'provider-failure' }
}
