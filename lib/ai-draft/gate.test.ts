import { beforeEach, describe, expect, it, vi } from 'vitest'

const redis = vi.hoisted(() => ({
  eval: vi.fn<(script: string, keys: string[], args: string[]) => Promise<string>>(),
}))
vi.mock('@upstash/redis', () => ({ Redis: { fromEnv: () => redis } }))

import { DAILY_GLOBAL_LIMIT, ENABLED_KEY, MONTHLY_BUDGET_CENTS, admit } from './gate'

beforeEach(() => {
  redis.eval.mockReset()
  vi.stubEnv('IP_HASH_SALT', 'salt')
})

describe('admission gate', () => {
  it('admits when the script says ok, keyed by a salted hash and never the raw address', async () => {
    redis.eval.mockResolvedValue('ok')
    expect(await admit('203.0.113.7', 1)).toBeNull()
    const [script, keys, args] = redis.eval.mock.calls[0]
    expect(script).toContain('EXISTS')
    expect(keys[0]).toBe(ENABLED_KEY)
    expect(keys[1]).toMatch(/^ai-draft:visitor:[0-9a-f]{32}$/)
    expect(keys.join()).not.toContain('203.0.113.7')
    expect(args.slice(0, 3)).toEqual([
      String(DAILY_GLOBAL_LIMIT),
      '1',
      String(MONTHLY_BUDGET_CENTS),
    ])
  })

  it('checks every limit before it writes anything', async () => {
    redis.eval.mockResolvedValue('ok')
    await admit('203.0.113.7', 1)
    const script: string = redis.eval.mock.calls[0][0]
    const lastCheck = script.lastIndexOf("return 'budget'")
    const firstWrite = script.indexOf("redis.call('SET'")
    expect(lastCheck).toBeGreaterThan(0)
    expect(firstWrite).toBeGreaterThan(lastCheck)
  })

  it.each(['disabled', 'already-used', 'capacity', 'budget'])('passes on %s', async reason => {
    redis.eval.mockResolvedValue(reason)
    expect(await admit('203.0.113.7', 1)).toBe(reason)
  })

  it.each([
    ['no address', null],
    ['a malformed address', 'not-an-ip'],
  ])('fails closed with %s, without asking Redis', async (_, ip) => {
    expect(await admit(ip, 1)).toBe('disabled')
    expect(redis.eval).not.toHaveBeenCalled()
  })

  it('fails closed without a salt', async () => {
    vi.stubEnv('IP_HASH_SALT', '')
    expect(await admit('203.0.113.7', 1)).toBe('disabled')
    expect(redis.eval).not.toHaveBeenCalled()
  })

  it('fails closed when Redis is unreachable or answers something unknown', async () => {
    redis.eval.mockRejectedValueOnce(new Error('down'))
    expect(await admit('203.0.113.7', 1)).toBe('disabled')
    redis.eval.mockResolvedValueOnce('surprise')
    expect(await admit('203.0.113.7', 1)).toBe('disabled')
  })
})
