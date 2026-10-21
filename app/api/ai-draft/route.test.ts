import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DraftOutcome } from '@/lib/ai-draft/config'

vi.mock('@/lib/ai-draft', () => ({
  get AI_DRAFT_ENABLED() {
    return process.env.AI_DRAFT_ENABLED === 'true'
  },
  MAX_BRIEF_LENGTH: 1500,
  generateFreeDraft:
    vi.fn<(brief: string, clientIp: string | null, signal: AbortSignal) => Promise<DraftOutcome>>(),
}))

import { generateFreeDraft } from '@/lib/ai-draft'
import { POST } from './route'

function makeRequest(body: unknown, opts?: { ip?: string; contentType?: string }) {
  return new Request('http://localhost/api/ai-draft', {
    method: 'POST',
    headers: {
      'content-type': opts?.contentType ?? 'application/json',
      ...(opts?.ip ? { 'x-forwarded-for': opts.ip } : {}),
    },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('input validation', () => {
  it('returns 400 for empty body (no brief field)', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'brief must be 1–1500 characters' })
    expect(generateFreeDraft).not.toHaveBeenCalled()
  })

  it('returns 400 for brief = empty string with correct message', async () => {
    const res = await POST(makeRequest({ brief: '' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'brief must be 1–1500 characters' })
    expect(generateFreeDraft).not.toHaveBeenCalled()
  })

  it('returns 400 for brief of 1501 characters with correct message', async () => {
    const res = await POST(makeRequest({ brief: 'a'.repeat(1501) }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'brief must be 1–1500 characters' })
    expect(generateFreeDraft).not.toHaveBeenCalled()
  })

  it('returns 400 for brief = non-string (number)', async () => {
    const res = await POST(makeRequest({ brief: 42 }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'brief must be 1–1500 characters' })
    expect(generateFreeDraft).not.toHaveBeenCalled()
  })

  it('returns 415 for non-JSON Content-Type', async () => {
    const res = await POST(makeRequest({ brief: 'Hello' }, { contentType: 'text/plain' }))
    expect(res.status).toBe(415)
    expect(generateFreeDraft).not.toHaveBeenCalled()
  })

  it('returns 400 for malformed JSON body', async () => {
    const request = new Request('http://localhost/api/ai-draft', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not valid json {',
    })
    const res = await POST(request)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Request body must be valid JSON' })
    expect(generateFreeDraft).not.toHaveBeenCalled()
  })
})

describe('feature disabled', () => {
  beforeEach(() => {
    delete process.env.AI_DRAFT_ENABLED
  })

  it('returns outcome:limit reason:disabled and does not call generateFreeDraft', async () => {
    const res = await POST(makeRequest({ brief: 'Hello world' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ outcome: 'limit', reason: 'disabled' })
    expect(generateFreeDraft).not.toHaveBeenCalled()
  })
})

describe('gate outcomes (AI_DRAFT_ENABLED = true)', () => {
  beforeEach(() => {
    process.env.AI_DRAFT_ENABLED = 'true'
  })

  afterEach(() => {
    delete process.env.AI_DRAFT_ENABLED
  })

  it('returns outcome:limit reason:already-used', async () => {
    vi.mocked(generateFreeDraft).mockResolvedValue({ kind: 'limit', reason: 'already-used' })
    const res = await POST(makeRequest({ brief: 'Hello world' }, { ip: '1.2.3.4' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ outcome: 'limit', reason: 'already-used' })
  })

  it('returns outcome:limit reason:capacity', async () => {
    vi.mocked(generateFreeDraft).mockResolvedValue({ kind: 'limit', reason: 'capacity' })
    const res = await POST(makeRequest({ brief: 'Hello world' }, { ip: '1.2.3.4' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ outcome: 'limit', reason: 'capacity' })
  })

  it('returns outcome:limit reason:budget', async () => {
    vi.mocked(generateFreeDraft).mockResolvedValue({ kind: 'limit', reason: 'budget' })
    const res = await POST(makeRequest({ brief: 'Hello world' }, { ip: '1.2.3.4' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ outcome: 'limit', reason: 'budget' })
  })

  it('passes null as clientIp when x-forwarded-for is absent', async () => {
    vi.mocked(generateFreeDraft).mockResolvedValue({ kind: 'limit', reason: 'capacity' })
    await POST(makeRequest({ brief: 'Hello world' }))
    expect(generateFreeDraft).toHaveBeenCalledWith('Hello world', null, expect.anything())
  })
})

describe('generation outcomes (AI_DRAFT_ENABLED = true)', () => {
  beforeEach(() => {
    process.env.AI_DRAFT_ENABLED = 'true'
  })

  afterEach(() => {
    delete process.env.AI_DRAFT_ENABLED
  })

  it('returns outcome:presentation with source when generateFreeDraft returns presentation', async () => {
    vi.mocked(generateFreeDraft).mockResolvedValue({ kind: 'presentation', source: '# Hello\n' })
    const res = await POST(makeRequest({ brief: 'Hello world' }, { ip: '1.2.3.4' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ outcome: 'presentation', source: '# Hello\n' })
  })

  it('returns outcome:invalid-output', async () => {
    vi.mocked(generateFreeDraft).mockResolvedValue({ kind: 'invalid-output' })
    const res = await POST(makeRequest({ brief: 'Hello world' }, { ip: '1.2.3.4' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ outcome: 'invalid-output' })
  })

  it('returns outcome:provider-failure', async () => {
    vi.mocked(generateFreeDraft).mockResolvedValue({ kind: 'provider-failure' })
    const res = await POST(makeRequest({ brief: 'Hello world' }, { ip: '1.2.3.4' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ outcome: 'provider-failure' })
  })
})

describe('Cache-Control header', () => {
  it('sets Cache-Control: no-store on 200 disabled response', async () => {
    delete process.env.AI_DRAFT_ENABLED
    const res = await POST(makeRequest({ brief: 'Hello world' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('sets Cache-Control: no-store on 200 generation response', async () => {
    process.env.AI_DRAFT_ENABLED = 'true'
    vi.mocked(generateFreeDraft).mockResolvedValue({ kind: 'presentation', source: '# Hi\n' })
    const res = await POST(makeRequest({ brief: 'Hello world' }, { ip: '1.2.3.4' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    delete process.env.AI_DRAFT_ENABLED
  })

  it('sets Cache-Control: no-store on 400 validation response', async () => {
    const res = await POST(makeRequest({ brief: '' }))
    expect(res.status).toBe(400)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('sets Cache-Control: no-store on 415 content-type response', async () => {
    const res = await POST(makeRequest({ brief: 'Hello' }, { contentType: 'text/plain' }))
    expect(res.status).toBe(415)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})

describe('credential leak check', () => {
  it('does not expose env var values or brief text in response body', async () => {
    delete process.env.AI_DRAFT_ENABLED
    process.env.ANTHROPIC_API_KEY = 'test-key-abc123'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-upstash-xyz'
    process.env.IP_HASH_SALT = 'test-salt-789'

    const brief = 'My super unique brief text for leak testing 99z'
    const res = await POST(makeRequest({ brief }))
    const body = await res.text()

    expect(body).not.toContain('test-key-abc123')
    expect(body).not.toContain('test-upstash-xyz')
    expect(body).not.toContain('test-salt-789')
    expect(body).not.toContain(brief)

    delete process.env.ANTHROPIC_API_KEY
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.IP_HASH_SALT
  })
})
