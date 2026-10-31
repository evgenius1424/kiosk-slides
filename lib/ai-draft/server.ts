import { draftSystemPrompt } from '@/lib/chat-prompt'
import { parsePresentation } from '@/lib/presentation'
import { type DraftOutcome, MAX_SLIDES } from '.'
import { type DraftEvent, admit, record, release } from './gate'
import { RESERVE_CENTS_PER_DRAFT, type Reply, type Turn, complete } from './provider'

export const AI_DRAFT_ENABLED = process.env.AI_DRAFT_ENABLED === 'true'

const OPEN_TAG = '<presentation>'
const CLOSE_TAG = '</presentation>'
const EXTERNAL = /https?:\/\/|\]\(|data:/i

export async function generateFreeDraft(
  brief: string,
  clientIp: string | null,
  signal: AbortSignal,
): Promise<DraftOutcome> {
  const limit = await admit(clientIp, RESERVE_CENTS_PER_DRAFT)
  if (limit) {
    await record('blocked')
    return { kind: 'limit', reason: limit }
  }
  const replies: Reply[] = []
  const { event, source } = await write(brief, replies, signal).catch(err => {
    console.error('ai-draft: draft failed', err)
    return { event: 'provider-failure' as const, source: '' }
  })
  const sum = (key: 'inputTokens' | 'outputTokens') => replies.reduce((n, r) => n + r[key], 0)
  await record(event, sum('inputTokens'), sum('outputTokens'))
  if (event === 'success') return { kind: 'presentation', source }
  await release(clientIp)
  return { kind: event === 'invalid-output' ? 'invalid-output' : 'provider-failure' }
}

async function write(
  brief: string,
  replies: Reply[],
  signal: AbortSignal,
): Promise<{ event: DraftEvent; source: string }> {
  const system = await draftSystemPrompt()
  const turns: Turn[] = [{ role: 'user', content: brief }]
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await complete(system, turns, signal)
    replies.push(reply)
    if (reply.text === null) return { event: 'provider-failure', source: '' }
    const checked = check(reply.text)
    if ('source' in checked) return { event: 'success', source: checked.source }
    console.error(`ai-draft: attempt ${attempt + 1} rejected: ${checked.error}`)
    turns.push(
      { role: 'assistant', content: reply.text },
      { role: 'user', content: repairRequest(checked.error) },
    )
  }
  return { event: 'invalid-output', source: '' }
}

function check(text: string): { source: string } | { error: string } {
  const open = text.lastIndexOf(OPEN_TAG)
  const close = text.indexOf(CLOSE_TAG, open)
  if (open < 0 || close < 0)
    return { error: `The reply has no ${OPEN_TAG}${CLOSE_TAG} tags around the presentation.` }
  const source = text.slice(open + OPEN_TAG.length, close).trim()
  if (EXTERNAL.test(source)) return { error: 'The presentation has a link or an image.' }
  try {
    const { slides } = parsePresentation(source)
    if (slides.length > MAX_SLIDES)
      return { error: `The presentation has ${slides.length} slides, more than ${MAX_SLIDES}.` }
    return { source }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

function repairRequest(error: string) {
  return `That presentation was rejected: ${error}\nReply with the whole corrected presentation inside ${OPEN_TAG}${CLOSE_TAG} tags, with no links or images.`
}
