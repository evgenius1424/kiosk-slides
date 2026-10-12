import { CLOSE_TAG, OPEN_TAG, type ChatEvent, type ChatMessage } from '@/lib/chat'
import { slideSystemPrompt, systemPrompt } from '@/lib/chat-prompt'
import { ChatGPTError, checkLocalRequest, streamResponse } from '@/lib/chatgpt'
import { parsePresentation, replaceSlide, reviewPresentation } from '@/lib/presentation'
import {
  SLIDES_CLOSE,
  SLIDES_OPEN,
  extractSlides,
  isSlideAction,
  slideRequest,
  type SlideAction,
} from '@/lib/slide-actions'
import { serverT } from '@/i18n/server'

const MAX_ATTEMPTS = 3
const SLIDE_ATTEMPTS = 2
const MAX_MESSAGES = 40
const MAX_MESSAGE_LENGTH = 20_000
const MAX_SOURCE_LENGTH = 200_000

export async function POST(request: Request) {
  const reason = checkLocalRequest(request, { mutating: true })
  if (reason) return Response.json({ error: reason }, { status: 403 })
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return Response.json({ error: serverT('jsonBody') }, { status: 415 })
  let body: Body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: serverT('jsonBody') }, { status: 400 })
  }
  const problem = body.mode === 'slide' ? validateSlide(body) : validate(body)
  if (problem) return Response.json({ error: problem }, { status: 400 })

  const slide = body.mode === 'slide'
  const instructions = await (slide ? slideSystemPrompt() : systemPrompt())
  const input = slide
    ? [{ role: 'user' as const, content: slideRequest(body.action!, body.source!, body.index!) }]
    : toInput(body.messages!, body.source || '')
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
        if (slide)
          await generateSlides(body as SlideBody, instructions, input, send, request.signal)
        else await generate(body.model!, instructions, input, send, request.signal)
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

type Body = {
  mode?: 'slide'
  messages?: ChatMessage[]
  source?: string
  model?: string
  action?: SlideAction
  index?: number
}
type SlideBody = Body & { source: string; model: string; action: SlideAction; index: number }

async function generate(
  model: string,
  instructions: string,
  input: ChatMessage[],
  send: (event: ChatEvent) => void,
  signal: AbortSignal,
) {
  let fallback: { source: string; reply: string } | undefined
  const finish = (source: string, reply: string) => {
    send({ type: 'presentation', source })
    send({ type: 'done', reply })
  }
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const reply = await streamResponse(
      { model, instructions, input },
      text => send({ type: 'text', text }),
      signal,
    )
    const result = extractPresentation(reply)
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

async function generateSlides(
  { model, source, index }: SlideBody,
  instructions: string,
  input: ChatMessage[],
  send: (event: ChatEvent) => void,
  signal: AbortSignal,
) {
  for (let attempt = 1; attempt <= SLIDE_ATTEMPTS; attempt++) {
    const reply = await streamResponse({ model, instructions, input }, () => {}, signal)
    const markdown = reply.includes(SLIDES_OPEN) ? extractSlides(reply) : ''
    const error = markdown
      ? slideError(source, index, markdown)
      : `Return the slide inside ${SLIDES_OPEN}${SLIDES_CLOSE} tags.`
    if (!error) {
      send({ type: 'slides', markdown })
      send({ type: 'done', reply })
      return
    }
    if (attempt === SLIDE_ATTEMPTS) {
      send({ type: 'error', message: serverT('stillBroken', { attempts: SLIDE_ATTEMPTS, error }) })
      return
    }
    send({ type: 'retry', error })
    input.push({ role: 'assistant', content: reply })
    input.push({
      role: 'user',
      content: `The new slide failed validation: ${error}\n\nFix that problem and return only the new slide inside ${SLIDES_OPEN}${SLIDES_CLOSE} tags.`,
    })
  }
}

function slideError(source: string, index: number, markdown: string) {
  try {
    parsePresentation(replaceSlide(source, index, markdown))
    return ''
  } catch (err) {
    return (err as Error).message
  }
}

function extractPresentation(
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
    return { kind: 'valid', source, problems: reviewPresentation(parsePresentation(source)) }
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

function validate(body: Body) {
  const { messages, source, model } = body
  if (!validModel(model)) return serverT('chooseModel')
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
    return serverT('presentationTooLarge')
  return ''
}

function validateSlide({ source, model, action, index }: Body) {
  if (!validModel(model)) return serverT('chooseModel')
  if (typeof source !== 'string' || source.length > MAX_SOURCE_LENGTH)
    return serverT('presentationTooLarge')
  if (!isSlideAction(action)) return serverT('badAction')
  try {
    const count = parsePresentation(source).slides.length
    if (!Number.isInteger(index) || index! < 0 || index! >= count) return serverT('badSlide')
  } catch (err) {
    return (err as Error).message
  }
  return ''
}

function validModel(model: unknown) {
  return typeof model === 'string' && /^[\w.:-]{1,100}$/.test(model)
}

function describeError(err: unknown, signal: AbortSignal) {
  if (signal.aborted) return serverT('stopped')
  if (err instanceof ChatGPTError) return err.message
  return serverT('generic')
}
