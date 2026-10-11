import { CLOSE_TAG, OPEN_TAG, type ChatEvent, type ChatMessage } from '@/lib/chat'
import { systemPrompt } from '@/lib/chat-prompt'
import { ChatGPTError, checkLocalRequest, streamResponse } from '@/lib/chatgpt'
import { parseDeck, reviewDeck } from '@/lib/deck'
import { serverT } from '@/i18n/server'

const MAX_ATTEMPTS = 3
const MAX_MESSAGES = 40
const MAX_MESSAGE_LENGTH = 20_000
const MAX_SOURCE_LENGTH = 200_000

export async function POST(request: Request) {
  const reason = checkLocalRequest(request, { mutating: true })
  if (reason) return Response.json({ error: reason }, { status: 403 })
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return Response.json({ error: serverT('jsonBody') }, { status: 415 })
  let body: { messages?: ChatMessage[]; source?: string; model?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: serverT('jsonBody') }, { status: 400 })
  }
  const problem = validate(body)
  if (problem) return Response.json({ error: problem }, { status: 400 })

  const instructions = await systemPrompt()
  const input = toInput(body.messages!, body.source || '')
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true
      const send = (event: ChatEvent) => {
        if (open)
          try {
            controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
          } catch {
            open = false
          }
      }
      try {
        await generate(body.model!, instructions, input, send, request.signal)
      } catch (err) {
        send({ type: 'error', message: describeError(err, request.signal) })
      } finally {
        if (open) controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

async function generate(
  model: string,
  instructions: string,
  input: ChatMessage[],
  send: (event: ChatEvent) => void,
  signal: AbortSignal,
) {
  let fallback: { source: string; reply: string } | undefined
  const finish = (source: string, reply: string) => {
    send({ type: 'deck', source })
    send({ type: 'done', reply })
  }
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const reply = await streamResponse(
      { model, instructions, input },
      text => send({ type: 'text', text }),
      signal,
    )
    const result = extractDeck(reply)
    if (result.kind === 'none') {
      if (fallback) finish(fallback.source, fallback.reply)
      else send({ type: 'done', reply })
      return
    }
    if (result.kind === 'valid') {
      if (fallback || attempt === MAX_ATTEMPTS || !result.problems.length)
        return finish(result.source, reply)
      fallback = { source: result.source, reply }
      send({ type: 'retry', error: result.problems.join(' '), polish: true })
      input.push({ role: 'assistant', content: reply })
      input.push({
        role: 'user',
        content: `The presentation is valid, but it misses what makes slides work:\n${result.problems.map(p => `- ${p}`).join('\n')}\n\nFix these and return the complete presentation inside <presentation></presentation> tags.`,
      })
      continue
    }
    if (attempt === MAX_ATTEMPTS) {
      if (fallback) return finish(fallback.source, fallback.reply)
      send({
        type: 'error',
        message: serverT('stillBroken', { attempts: MAX_ATTEMPTS, error: result.error }),
      })
      send({ type: 'done', reply })
      return
    }
    send({ type: 'retry', error: result.error })
    input.push({ role: 'assistant', content: reply })
    input.push({
      role: 'user',
      content: `The presentation failed validation: ${result.error}\n\nFix that problem and return the complete corrected presentation inside <presentation></presentation> tags.`,
    })
  }
}

function extractDeck(
  reply: string,
):
  | { kind: 'none' }
  | { kind: 'valid'; source: string; problems: string[] }
  | { kind: 'invalid'; error: string } {
  const open = reply.lastIndexOf(OPEN_TAG)
  if (open < 0) return { kind: 'none' }
  const close = reply.indexOf(CLOSE_TAG, open)
  if (close < 0)
    return {
      kind: 'invalid',
      error: `The presentation was cut off before the closing ${CLOSE_TAG} tag.`,
    }
  const source = reply.slice(open + OPEN_TAG.length, close).trim() + '\n'
  try {
    return { kind: 'valid', source, problems: reviewDeck(parseDeck(source)) }
  } catch (err) {
    return { kind: 'invalid', error: (err as Error).message }
  }
}

function toInput(history: ChatMessage[], source: string): ChatMessage[] {
  return history.map((message, i) => {
    if (i < history.length - 1 || !source.trim())
      return { role: message.role, content: message.content }
    return {
      role: 'user',
      content: `The presentation currently open in the editor:\n${OPEN_TAG}\n${source.trim()}\n${CLOSE_TAG}\n\n${message.content}`,
    }
  })
}

function validate(body: { messages?: ChatMessage[]; source?: string; model?: string }) {
  const { messages, source, model } = body
  if (typeof model !== 'string' || !/^[\w.:-]{1,100}$/.test(model)) return serverT('chooseModel')
  if (!Array.isArray(messages) || !messages.length) return serverT('noMessages')
  if (messages.length > MAX_MESSAGES) return serverT('tooLong')
  if (
    messages.some(
      m =>
        (m?.role !== 'user' && m?.role !== 'assistant') ||
        typeof m.content !== 'string' ||
        !m.content.trim() ||
        m.content.length > MAX_MESSAGE_LENGTH,
    )
  )
    return serverT('badMessage', { max: MAX_MESSAGE_LENGTH })
  if (messages[0].role !== 'user' || messages[messages.length - 1].role !== 'user')
    return serverT('badOrder')
  if (source !== undefined && (typeof source !== 'string' || source.length > MAX_SOURCE_LENGTH))
    return serverT('deckTooLarge')
  return ''
}

function describeError(err: unknown, signal: AbortSignal) {
  if (signal.aborted) return serverT('stopped')
  if (err instanceof ChatGPTError) return err.message
  return serverT('generic')
}
