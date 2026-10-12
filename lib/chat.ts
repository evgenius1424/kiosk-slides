import type { ChatGPTModel, ChatGPTStatus } from './chatgpt'
import type { SlideAction } from './slide-actions'

export type { ChatGPTModel, ChatGPTStatus }
export const MODEL_KEY = 'kiosk-chatgpt-model'
export const MANAGE_USAGE_URL = 'https://chatgpt.com/#settings'
export const OPEN_TAG = '<presentation>'
export const CLOSE_TAG = '</presentation>'

export class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string }
export type ChatEvent =
  | { type: 'text'; text: string }
  | { type: 'retry'; error: string; polish?: boolean }
  | { type: 'presentation'; source: string }
  | { type: 'slides'; markdown: string }
  | { type: 'done'; reply: string }
  | { type: 'error'; message: string }

export async function fetchStatus(): Promise<ChatGPTStatus> {
  return (await request('/api/chatgpt/status')) as ChatGPTStatus
}

export async function fetchModels(): Promise<ChatGPTModel[]> {
  return ((await request('/api/chatgpt/models')) as { models: ChatGPTModel[] }).models
}

export async function connectChatGPT() {
  const { url } = (await request('/api/chatgpt/connect', { method: 'POST' })) as { url: string }
  window.location.assign(url)
}

export async function disconnectChatGPT() {
  return (await request('/api/chatgpt/disconnect', { method: 'POST' })) as { revoked: boolean }
}

export async function streamChat(
  messages: ChatMessage[],
  source: string,
  model: string,
  onEvent: (event: ChatEvent) => void,
  signal: AbortSignal,
) {
  await stream({ messages, source, model }, onEvent, signal)
}

export async function changeSlide(
  request: { action: SlideAction; source: string; index: number; model: string },
  signal?: AbortSignal,
) {
  let markdown = ''
  let error = ''
  await stream(
    { mode: 'slide', ...request },
    event => {
      if (event.type === 'slides') markdown = event.markdown
      if (event.type === 'error') error = event.message
    },
    signal,
  )
  if (!markdown) throw new Error(error)
  return markdown
}

export function visibleReply(text: string) {
  const open = text.indexOf(OPEN_TAG)
  if (open < 0) return { text: text.trim(), writing: false }
  const close = text.indexOf(CLOSE_TAG, open)
  const rest = close < 0 ? '' : text.slice(close + CLOSE_TAG.length)
  return { text: (text.slice(0, open) + rest).trim(), writing: close < 0 }
}

async function stream(body: object, onEvent: (event: ChatEvent) => void, signal?: AbortSignal) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => null)
    throw new RequestError(body?.error || '', response.status)
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

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: 'no-store', ...init })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new RequestError(body?.error || '', response.status)
  return body
}
