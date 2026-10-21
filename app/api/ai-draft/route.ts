import { MAX_BRIEF_LENGTH } from '@/lib/ai-draft'
import { AI_DRAFT_ENABLED, generateFreeDraft } from '@/lib/ai-draft/server'

export const maxDuration = 120

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function POST(request: Request) {
  const brief = await readBrief(request)
  if (brief === null)
    return Response.json(
      { error: `Send a brief of 1–${MAX_BRIEF_LENGTH} characters.` },
      { status: 400, headers: NO_STORE },
    )
  const outcome = AI_DRAFT_ENABLED
    ? await generateFreeDraft(brief, clientIp(request), request.signal)
    : { kind: 'limit', reason: 'disabled' }
  return Response.json(outcome, { headers: NO_STORE })
}

async function readBrief(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) return null
  const body = await request.json().catch(() => null)
  const brief = typeof body?.brief === 'string' ? body.brief.trim() : ''
  return brief && brief.length <= MAX_BRIEF_LENGTH ? brief : null
}

function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null
}
