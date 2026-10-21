import { createHash } from 'node:crypto'
import { isIP } from 'node:net'
import { Redis } from '@upstash/redis'
import type { DraftLimit } from '.'

export const DAILY_GLOBAL_LIMIT = 20
export const MONTHLY_BUDGET_CENTS = 800
export const ENABLED_KEY = 'ai-draft:enabled'

export type DraftEvent = 'blocked' | 'success' | 'invalid-output' | 'provider-failure'

const DAY = 24 * 60 * 60

const ADMIT = `
if redis.call('GET', KEYS[1]) ~= '1' then return 'disabled' end
if redis.call('EXISTS', KEYS[2]) == 1 then return 'already-used' end
if tonumber(redis.call('GET', KEYS[3]) or '0') >= tonumber(ARGV[1]) then return 'capacity' end
if tonumber(redis.call('GET', KEYS[4]) or '0') + tonumber(ARGV[2]) > tonumber(ARGV[3]) then return 'budget' end
redis.call('SET', KEYS[2], '1', 'EX', ARGV[4])
redis.call('INCR', KEYS[3])
redis.call('EXPIRE', KEYS[3], ARGV[5])
redis.call('INCRBY', KEYS[4], ARGV[2])
redis.call('EXPIRE', KEYS[4], ARGV[6])
return 'ok'
`

export async function admit(
  clientIp: string | null,
  reserveCents: number,
): Promise<DraftLimit | null> {
  const salt = process.env.IP_HASH_SALT
  if (!clientIp || !isIP(clientIp) || !salt) return 'disabled'
  const { day, month } = periods()
  try {
    const result = await Redis.fromEnv().eval<string[], string>(
      ADMIT,
      [
        ENABLED_KEY,
        `ai-draft:visitor:${visitorHash(clientIp, salt)}`,
        `ai-draft:day:${day}`,
        `ai-draft:reserved:${month}`,
      ],
      [
        String(DAILY_GLOBAL_LIMIT),
        String(reserveCents),
        String(MONTHLY_BUDGET_CENTS),
        String(DAY),
        String(2 * DAY),
        String(40 * DAY),
      ],
    )
    return result === 'ok' ? null : isLimit(result) ? result : 'disabled'
  } catch {
    return 'disabled'
  }
}

export async function record(event: DraftEvent, inputTokens = 0, outputTokens = 0) {
  const key = `ai-draft:stats:${periods().month}`
  try {
    await Redis.fromEnv()
      .pipeline()
      .hincrby(key, event, 1)
      .hincrby(key, 'input-tokens', inputTokens)
      .hincrby(key, 'output-tokens', outputTokens)
      .expire(key, 400 * DAY)
      .exec()
  } catch {}
}

function periods() {
  const now = new Date().toISOString()
  return { day: now.slice(0, 10), month: now.slice(0, 7) }
}

function visitorHash(ip: string, salt: string) {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)
}

function isLimit(value: string): value is DraftLimit {
  return ['disabled', 'already-used', 'capacity', 'budget'].includes(value)
}
