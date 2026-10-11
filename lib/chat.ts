export type ChatMessage = { role: 'user' | 'assistant'; content: string }
export type ChatEvent =
  | { type: 'text'; text: string }
  | { type: 'retry'; error: string }
  | { type: 'deck'; source: string }
  | { type: 'done'; reply: string }
  | { type: 'error'; message: string }

export async function streamChat(messages: ChatMessage[], source: string, onEvent: (event: ChatEvent) => void, signal: AbortSignal) {
  const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, source }), signal })
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || `The chat request failed (${response.status}).`)
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    lines.filter(Boolean).forEach(line => onEvent(JSON.parse(line)))
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer))
}

export function visibleReply(text: string) {
  const open = text.indexOf('<deck>')
  if (open < 0) return { text: text.trim(), writing: false }
  const close = text.indexOf('</deck>', open)
  const rest = close < 0 ? '' : text.slice(close + 7)
  return { text: (text.slice(0, open) + rest).trim(), writing: close < 0 }
}
