import { AI_DRAFT_ENABLED, MAX_BRIEF_LENGTH, generateFreeDraft } from '@/lib/ai-draft'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return Response.json(
      { error: 'Content-Type must be application/json' },
      { status: 415, headers: NO_STORE },
    )

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Request body must be valid JSON' },
      { status: 400, headers: NO_STORE },
    )
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).brief !== 'string' ||
    (body as Record<string, unknown>).brief === ''
  ) {
    return Response.json(
      { error: 'brief must be 1–1500 characters' },
      { status: 400, headers: NO_STORE },
    )
  }

  const brief = (body as Record<string, unknown>).brief as string
  if (brief.length > MAX_BRIEF_LENGTH)
    return Response.json(
      { error: 'brief must be 1–1500 characters' },
      { status: 400, headers: NO_STORE },
    )

  if (!AI_DRAFT_ENABLED)
    return Response.json({ outcome: 'limit', reason: 'disabled' }, { headers: NO_STORE })

  const forwarded = request.headers.get('x-forwarded-for')
  const clientIp = forwarded ? forwarded.split(',')[0].trim() : null

  const result = await generateFreeDraft(brief, clientIp, request.signal)

  const response =
    result.kind === 'presentation'
      ? { outcome: 'presentation', source: result.source }
      : result.kind === 'limit'
        ? { outcome: 'limit', reason: result.reason }
        : result.kind === 'invalid-output'
          ? { outcome: 'invalid-output' }
          : { outcome: 'provider-failure' }

  return Response.json(response, { headers: NO_STORE })
}
