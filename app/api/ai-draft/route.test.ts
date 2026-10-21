import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_BRIEF_LENGTH, MAX_SLIDES } from '@/lib/ai-draft'
import type { DraftLimit } from '@/lib/ai-draft'
import type { Reply, Turn } from '@/lib/ai-draft/provider'
import { parsePresentation } from '@/lib/presentation'

const gate = vi.hoisted(() => ({
  admit: vi.fn<(ip: string | null, reserve: number) => Promise<DraftLimit | null>>(),
  record: vi.fn<(event: string, input?: number, output?: number) => Promise<void>>(),
}))
const provider = vi.hoisted(() => ({
  complete: vi.fn<(system: string, turns: Turn[], signal: AbortSignal) => Promise<Reply>>(),
}))
vi.mock('@/lib/ai-draft/gate', () => gate)
vi.mock('@/lib/ai-draft/provider', async importOriginal => ({
  ...(await importOriginal<object>()),
  ...provider,
}))

const VALID = '---\ntitle: Four days\n---\n\n# Less is **more**\n\n---\n\n# Same pay\n'
const SECRETS = {
  ANTHROPIC_API_KEY: 'sk-ant-secret',
  UPSTASH_REDIS_REST_TOKEN: 'upstash-secret',
  IP_HASH_SALT: 'salt-secret',
}

beforeEach(() => {
  vi.clearAllMocks()
  provider.complete.mockReset()
  gate.admit.mockResolvedValue(null)
  gate.record.mockResolvedValue()
  for (const [key, value] of Object.entries(SECRETS)) vi.stubEnv(key, value)
})

describe('POST /api/ai-draft', () => {
  it('returns a presentation the parser accepts on a valid first attempt', async () => {
    replies(VALID)
    const outcome = await draft()
    expect(outcome).toEqual({ kind: 'presentation', source: VALID.trim() })
    expect(parsePresentation(outcome.source).slides).toHaveLength(2)
    expect(provider.complete).toHaveBeenCalledOnce()
    expect(gate.record).toHaveBeenCalledWith('success', 100, 50)
  })

  it('repairs one invalid result, telling the model what the parser said', async () => {
    replies('# One\n\n## Not allowed', VALID)
    expect(await draft()).toEqual({ kind: 'presentation', source: VALID.trim() })
    expect(provider.complete).toHaveBeenCalledTimes(2)
    const turns = provider.complete.mock.calls[1][1]
    expect(turns.map(t => t.role)).toEqual(['user', 'assistant', 'user'])
    expect(turns[2].content).toMatch(/^That presentation was rejected: .+/)
    expect(gate.record).toHaveBeenCalledWith('success', 200, 100)
  })

  it('stops after the one repair when the output is still invalid', async () => {
    replies('no tags', 'still no tags', VALID)
    expect(await draft()).toEqual({ kind: 'invalid-output' })
    expect(provider.complete).toHaveBeenCalledTimes(2)
    expect(gate.record).toHaveBeenCalledWith('invalid-output', 200, 100)
  })

  it.each([
    ['a link', '# Read [the docs](https://example.com)'],
    ['an image', '# Team\n\n![Team](/images/team.jpg)'],
    ['a bare address', '# Visit https://example.com'],
    [
      'too many slides',
      Array.from({ length: MAX_SLIDES + 1 }, (_, i) => `# ${i}`).join('\n\n---\n\n'),
    ],
  ])('never returns a presentation with %s', async (_, source) => {
    replies(source, source)
    expect(await draft()).toEqual({ kind: 'invalid-output' })
    expect(provider.complete).toHaveBeenCalledTimes(2)
  })

  it('makes no repair call after a provider failure, refusal, timeout or cancel', async () => {
    provider.complete.mockResolvedValue({ text: null, inputTokens: 0, outputTokens: 0 })
    expect(await draft()).toEqual({ kind: 'provider-failure' })
    expect(provider.complete).toHaveBeenCalledOnce()
    expect(gate.record).toHaveBeenCalledWith('provider-failure', 0, 0)
  })

  it.each<DraftLimit>(['disabled', 'already-used', 'capacity', 'budget'])(
    'returns the %s limit without calling the provider',
    async reason => {
      gate.admit.mockResolvedValue(reason)
      expect(await draft()).toEqual({ kind: 'limit', reason })
      expect(provider.complete).not.toHaveBeenCalled()
      expect(gate.record).toHaveBeenCalledWith('blocked')
    },
  )

  it('admits by the first forwarded address, reserving before the provider runs', async () => {
    gate.admit.mockImplementation(async () => {
      expect(provider.complete).not.toHaveBeenCalled()
      return null
    })
    replies(VALID)
    await draft('A talk', { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })
    expect(gate.admit).toHaveBeenCalledWith('203.0.113.7', expect.any(Number))
  })

  it('passes no address when the platform sent none', async () => {
    replies(VALID)
    await draft('A talk', {})
    expect(gate.admit).toHaveBeenCalledWith(null, expect.any(Number))
  })

  it.each([
    ['an empty brief', { brief: '  ' }],
    ['no brief', {}],
    ['a number', { brief: 42 }],
    ['a long brief', { brief: 'a'.repeat(MAX_BRIEF_LENGTH + 1) }],
  ])('rejects %s before the gate', async (_, body) => {
    const response = await post(JSON.stringify(body))
    expect(response.status).toBe(400)
    expect(gate.admit).not.toHaveBeenCalled()
  })

  it('rejects a body that is not JSON before the gate', async () => {
    expect((await post('{', 'application/json')).status).toBe(400)
    expect((await post('{"brief":"hi"}', 'text/plain')).status).toBe(400)
    expect(gate.admit).not.toHaveBeenCalled()
  })

  it('says disabled without touching the gate while the deployment switch is off', async () => {
    const response = await post(JSON.stringify({ brief: 'A talk' }), 'application/json', false)
    expect(await response.json()).toEqual({ kind: 'limit', reason: 'disabled' })
    expect(gate.admit).not.toHaveBeenCalled()
  })

  it('never caches and never echoes a secret', async () => {
    replies(VALID)
    const response = await post(JSON.stringify({ brief: 'A talk' }))
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = await response.text()
    for (const secret of Object.values(SECRETS)) expect(body).not.toContain(secret)
  })
})

function replies(...sources: string[]) {
  for (const source of sources)
    provider.complete.mockResolvedValueOnce({
      text: `Here you go.\n<presentation>\n${source}\n</presentation>`,
      inputTokens: 100,
      outputTokens: 50,
    })
}

async function draft(
  brief = 'A talk',
  headers: Record<string, string> = { 'x-forwarded-for': '203.0.113.7' },
) {
  const response = await post(JSON.stringify({ brief }), 'application/json', true, headers)
  expect(response.status).toBe(200)
  return response.json()
}

async function post(
  body: string,
  contentType = 'application/json',
  enabled = true,
  headers: Record<string, string> = {},
) {
  vi.stubEnv('AI_DRAFT_ENABLED', enabled ? 'true' : 'false')
  vi.resetModules()
  const { POST } = await import('./route')
  return POST(
    new Request('https://kiosk.example/api/ai-draft', {
      method: 'POST',
      headers: { 'content-type': contentType, ...headers },
      body,
    }),
  )
}
