export const MAX_BRIEF_LENGTH = 1500
export const MAX_SLIDES = 10

export type DraftLimit = 'disabled' | 'already-used' | 'capacity' | 'budget'
export type DraftOutcome =
  | { kind: 'presentation'; source: string }
  | { kind: 'limit'; reason: DraftLimit }
  | { kind: 'invalid-output' }
  | { kind: 'provider-failure' }
export type DraftProgress = { type: 'text'; text: string } | { type: 'retry' }
export type DraftEvent = DraftProgress | { type: 'outcome'; outcome: DraftOutcome }

export async function requestDraft(
  brief: string,
  signal?: AbortSignal,
  onWriting: (text: string) => void = () => {},
): Promise<DraftOutcome> {
  try {
    const response = await fetch('/api/ai-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief }),
      signal,
    })
    if (response.ok) return await readDraft(response, onWriting)
  } catch (err) {
    if (signal?.aborted) throw err
  }
  return { kind: 'provider-failure' }
}

async function readDraft(response: Response, onWriting: (text: string) => void) {
  if (!response.body) return { kind: 'provider-failure' } as const
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  let text = ''
  let repairing = false
  let outcome: DraftOutcome = { kind: 'provider-failure' }
  const take = (line: string) => {
    const event = JSON.parse(line) as DraftEvent
    if (event.type === 'retry') repairing = true
    if (event.type === 'outcome') outcome = event.outcome
    if (event.type !== 'text' || repairing) return
    text += event.text
    onWriting(text)
  }
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    lines.filter(Boolean).forEach(take)
  }
  if (buffer.trim()) take(buffer)
  return outcome
}
