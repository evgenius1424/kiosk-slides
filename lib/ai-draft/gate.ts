import { createHash } from 'node:crypto'
import { Redis } from '@upstash/redis'
import {
  type DraftOutcome,
  DAILY_GLOBAL_LIMIT,
  MONTHLY_BUDGET_CENTS,
  getIpHashSalt,
  getUpstashToken,
  getUpstashUrl,
} from './config'

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

local monthly = redis.call('INCR', KEYS[4])
if monthly == 1 then redis.call('EXPIRE', KEYS[4], ARGV[4]) end
if monthly > tonumber(ARGV[5]) then
  redis.call('DECR', KEYS[4])
  return 'budget'
end

return 'ok'
`

function hashIp(ip: string): string {
  return createHash('sha256')
    .update(getIpHashSalt() + ':' + ip)
    .digest('hex')
    .slice(0, 32)
}

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
  ]

  try {
    const redis = new Redis({ url: getUpstashUrl(), token: getUpstashToken() })
    const result = await redis.eval(LUA_SCRIPT, keys, args)

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

export function releaseReservation(): void {
  // no-op: reservations are retained even if the provider call fails
}

export async function setRemoteEnabled(enabled: boolean): Promise<void> {
  const redis = new Redis({ url: getUpstashUrl(), token: getUpstashToken() })
  await redis.set('ai-draft:enabled', enabled ? '1' : '0')
}
