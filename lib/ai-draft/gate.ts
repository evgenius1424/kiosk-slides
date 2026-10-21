import { createHash } from 'node:crypto'
import { Redis } from '@upstash/redis'
import {
  type DraftOutcome,
  DAILY_GLOBAL_LIMIT,
  MONTHLY_BUDGET_CENTS,
  WORST_CASE_COST_CENTS_PER_ATTEMPT,
  getIpHashSalt,
  getUpstashToken,
  getUpstashUrl,
} from './config'

type GateResult = 'ok' | 'disabled' | 'already-used' | 'capacity' | 'budget'

const LUA_SCRIPT = `
local enabled = redis.call('GET', KEYS[1])
if enabled ~= '1' then return 'disabled' end

local set = redis.call('SET', KEYS[2], '1', 'NX', 'EX', ARGV[1])
if set == false then return 'already-used' end

local daily = redis.call('INCR', KEYS[3])
if daily == 1 then redis.call('EXPIRE', KEYS[3], ARGV[2]) end
if daily > tonumber(ARGV[3]) then
  redis.call('DECR', KEYS[3])
  return 'capacity'
end

local monthly = redis.call('INCRBY', KEYS[4], tonumber(ARGV[6]))
if monthly == tonumber(ARGV[6]) then redis.call('EXPIRE', KEYS[4], ARGV[4]) end
if monthly > tonumber(ARGV[5]) then
  redis.call('DECRBY', KEYS[4], tonumber(ARGV[6]))
  return 'budget'
end

return 'ok'
`

export async function admitRequest(clientIp: string | null): Promise<DraftOutcome | null> {
  if (!clientIp) return { kind: 'limit', reason: 'disabled' }

  const hash = hashIp(clientIp)
  const utcDate = new Date().toISOString().slice(0, 10)
  const utcYearMonth = new Date().toISOString().slice(0, 7)

  const keys = [
    'ai-draft:enabled',
    `ai-draft:hash:${hash}`,
    `ai-draft:daily:${utcDate}`,
    `ai-draft:monthly:${utcYearMonth}`,
  ]

  const args = [
    '86400',
    '90000',
    String(DAILY_GLOBAL_LIMIT),
    '2851200',
    String(MONTHLY_BUDGET_CENTS),
    String(WORST_CASE_COST_CENTS_PER_ATTEMPT),
  ]

  try {
    const redis = new Redis({ url: getUpstashUrl(), token: getUpstashToken() })
    const result = (await redis.eval(LUA_SCRIPT, keys, args)) as GateResult

    if (result === 'ok') return null
    if (result === 'disabled') return { kind: 'limit', reason: 'disabled' }
    if (result === 'already-used') return { kind: 'limit', reason: 'already-used' }
    if (result === 'capacity') return { kind: 'limit', reason: 'capacity' }
    if (result === 'budget') return { kind: 'limit', reason: 'budget' }

    return { kind: 'provider-failure' }
  } catch {
    return { kind: 'provider-failure' }
  }
}

function hashIp(ip: string): string {
  return createHash('sha256')
    .update(getIpHashSalt() + ':' + ip)
    .digest('hex')
    .slice(0, 32)
}
