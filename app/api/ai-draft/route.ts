import { type DraftEvent, MAX_BRIEF_LENGTH } from '@/lib/ai-draft'
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
  const ip = clientIp(request)
  const encoder = new TextEncoder()
  const gone = new AbortController()
  request.signal.addEventListener('abort', () => gone.abort())
  const body = new ReadableStream<Uint8Array>({
    cancel: () => gone.abort(),
    async start(controller) {
      const send = (event: DraftEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        } catch {}
      }
      const outcome = AI_DRAFT_ENABLED
        ? await generateFreeDraft(brief, ip, gone.signal, send)
        : ({ kind: 'limit', reason: 'disabled' } as const)
      send({ type: 'outcome', outcome })
      try {
        controller.close()
      } catch {}
    },
  })
  return new Response(body, {
    headers: { ...NO_STORE, 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  })
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
