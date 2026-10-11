import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { ChatEvent, ChatMessage } from '@/lib/chat'
import { ChatGPTError, checkLocalRequest, streamResponse } from '@/lib/chatgpt'
import { parseDeck } from '@/lib/deck'

const MAX_ATTEMPTS = 3
const MAX_MESSAGES = 40
const MAX_MESSAGE_LENGTH = 20_000
const MAX_SOURCE_LENGTH = 200_000

const FORMAT_GUIDE = `You write slide decks for Kiosk Slides, a tool for presenting one clear idea per slide on a TV, in a room, or on a call.

Talk with the user about what they want. When you create or change a deck, reply with one or two short sentences about what you made, then the complete deck source inside <deck></deck> tags. Always return the whole deck, never a partial edit. If the user only asks a question, answer briefly without a deck.

Deck format rules (a parser enforces these and rejects the deck otherwise):
- Optional front matter at the top between --- lines with title, theme (room-dark or room-light) and autoplay settings, as in the example.
- Slides are separated by a line containing only ---.
- Every slide has exactly one "# " headline of at most 115 characters. Wrap the key phrase in ==double equals== to highlight it; highlights must be closed.
- Start each slide with a :::meta block. Allowed fields: title, label, footer, layout (auto, stacked, or split-left), duration (like 12s). Close every directive with ::: on its own line.
- A slide may have at most ONE supporting widget:
  - :::before-after with before: and after: fields
  - :::flow with starts: [A, B] (one or two starts) and up to four "- " step lines
  - :::metric with value: and caption: fields
  - a numbered list of at most five steps (1. 2. 3.)
  - one fenced code block of at most 12 lines
  - one image ![alt](https://... "caption") using an HTTPS URL
- Body text outside widgets must stay under 320 characters. List items and flow steps stay under 95 characters. Widget fields stay under 450 characters.
- At most 40 slides. Prefer 5 to 12.

Write for the last row of the room: short headlines, one idea per slide, plain language.

Here is an example deck that follows every rule:`

export async function POST(request: Request) {
  const reason = checkLocalRequest(request, { mutating: true })
  if (reason) return Response.json({ error: reason }, { status: 403 })
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'Send a JSON body.' }, { status: 415 })
  let body: { messages?: ChatMessage[]; source?: string; model?: string }
  try { body = await request.json() } catch { return Response.json({ error: 'Send a JSON body.' }, { status: 400 }) }
  const problem = validate(body)
  if (problem) return Response.json({ error: problem }, { status: 400 })

  const instructions = await systemPrompt()
  const input = toInput(body.messages!, body.source || '')
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true
      const send = (event: ChatEvent) => { if (open) try { controller.enqueue(encoder.encode(JSON.stringify(event) + '\n')) } catch { open = false } }
      try { await generate(body.model!, instructions, input, send, request.signal) }
      catch (err) { send({ type: 'error', message: describeError(err, request.signal) }) }
      finally { if (open) controller.close() }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } })
}

async function generate(model: string, instructions: string, input: ChatMessage[], send: (event: ChatEvent) => void, signal: AbortSignal) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const reply = await streamResponse({ model, instructions, input }, text => send({ type: 'text', text }), signal)
    const result = extractDeck(reply)
    if (result.kind === 'none') { send({ type: 'done', reply }); return }
    if (result.kind === 'valid') { send({ type: 'deck', source: result.source }); send({ type: 'done', reply }); return }
    if (attempt === MAX_ATTEMPTS) { send({ type: 'error', message: `The deck still has a problem after ${MAX_ATTEMPTS} tries: ${result.error}` }); send({ type: 'done', reply }); return }
    send({ type: 'retry', error: result.error })
    input.push({ role: 'assistant', content: reply })
    input.push({ role: 'user', content: `The deck failed validation: ${result.error}\n\nFix that problem and return the complete corrected deck inside <deck></deck> tags.` })
  }
}

function extractDeck(reply: string): { kind: 'none' } | { kind: 'valid'; source: string } | { kind: 'invalid'; error: string } {
  const open = reply.lastIndexOf('<deck>')
  if (open < 0) return { kind: 'none' }
  const close = reply.indexOf('</deck>', open)
  if (close < 0) return { kind: 'invalid', error: 'The deck was cut off before the closing </deck> tag.' }
  const source = reply.slice(open + 6, close).trim() + '\n'
  try { parseDeck(source); return { kind: 'valid', source } }
  catch (err) { return { kind: 'invalid', error: (err as Error).message } }
}

function toInput(history: ChatMessage[], source: string): ChatMessage[] {
  return history.map((message, i) => {
    if (i < history.length - 1 || !source.trim()) return { role: message.role, content: message.content }
    return { role: 'user', content: `The deck currently open in the editor:\n<deck>\n${source.trim()}\n</deck>\n\n${message.content}` }
  })
}

let cachedPrompt: string | undefined
async function systemPrompt() {
  if (cachedPrompt) return cachedPrompt
  const example = await readFile(path.join(process.cwd(), 'public/example.md'), 'utf8')
  cachedPrompt = `${FORMAT_GUIDE}\n<example>\n${example.trim()}\n</example>`
  return cachedPrompt
}

function validate(body: { messages?: ChatMessage[]; source?: string; model?: string }) {
  const { messages, source, model } = body
  if (typeof model !== 'string' || !/^[\w.:-]{1,100}$/.test(model)) return 'Choose a ChatGPT model.'
  if (!Array.isArray(messages) || !messages.length) return 'Send at least one message.'
  if (messages.length > MAX_MESSAGES) return 'This conversation is too long. Start a new chat.'
  if (messages.some(m => (m?.role !== 'user' && m?.role !== 'assistant') || typeof m.content !== 'string' || !m.content.trim() || m.content.length > MAX_MESSAGE_LENGTH)) return 'Each message needs a role and text under 20,000 characters.'
  if (messages[0].role !== 'user' || messages[messages.length - 1].role !== 'user') return 'The conversation must start and end with a user message.'
  if (source !== undefined && (typeof source !== 'string' || source.length > MAX_SOURCE_LENGTH)) return 'The current deck is too large to send.'
  return ''
}

function describeError(err: unknown, signal: AbortSignal) {
  if (signal.aborted) return 'Generation stopped.'
  if (err instanceof ChatGPTError) return err.message
  return 'Something went wrong while generating the deck.'
}
