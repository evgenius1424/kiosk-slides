import { createHash, createPublicKey, randomBytes, randomUUID, verify, type JsonWebKey } from 'node:crypto'
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { serverT } from '@/i18n/server'

export type ChatGPTStatus =
  | { available: false; reason: string }
  | { available: true; connected: false }
  | { available: true; connected: true; email: string; planUsage: boolean }
export type ChatGPTModel = { slug: string; name: string }

const AUTH_ORIGIN = process.env.CHATGPT_AUTH_ORIGIN || 'https://auth.openai.com'
const API_BASE = process.env.CHATGPT_API_BASE || 'https://api.openai.com/v1'
const ISSUER = 'https://auth.openai.com'
const RESOURCE = 'https://api.openai.com/v1'
const SCOPES = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct'
const PLAN_SCOPE = 'chatgpt.tokens.use.direct'
const APP_NAME = 'Kiosk Slides'
const CALLBACK_PATH = '/auth/callback'
const PENDING_TTL = 10 * 60 * 1000
const REFRESH_MARGIN = 120

export class ChatGPTError extends Error {
  constructor(message: string, readonly code = 'chatgpt_error', readonly status = 400) { super(message) }
}

export function checkLocalRequest(request: Request, { mutating = false } = {}) {
  if (process.env.VERCEL) return serverT('hostedOnly')
  const url = new URL(request.url)
  const host = request.headers.get('host') || url.host
  if (!isLoopbackHost(host)) return serverT('openLocally')
  if (mutating) {
    const origin = request.headers.get('origin')
    if (!origin || new URL(origin).host !== host) return serverT('wrongOrigin')
  }
  return ''
}

export async function getStatus(): Promise<ChatGPTStatus> {
  const store = await readStore()
  if (!store.account) return { available: true, connected: false }
  return { available: true, connected: true, email: store.account.email, planUsage: hasPlanScope(store.account.scopes) }
}

export async function startSignIn(request: Request) {
  const store = await readStore()
  const hostId = store.hostId || `urn:uuid:${randomUUID()}`
  if (!store.hostId) await writeStore({ ...store, hostId })
  const port = new URL(request.url).port || '80'
  const redirectUri = `http://127.0.0.1:${port}${CALLBACK_PATH}`
  const state = base64url(randomBytes(32))
  const nonce = base64url(randomBytes(32))
  const verifier = base64url(randomBytes(48))
  const clientId = store.clientId || 'dynamic_agent_client'
  const returnTo = new URL('/', request.headers.get('origin') || request.url).toString()
  pending().set(state, { nonce, verifier, redirectUri, clientId, returnTo, createdAt: Date.now() })
  const params = new URLSearchParams({
    client_id: clientId,
    ext_agent_host_id: hostId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    resource: RESOURCE,
    state,
    nonce,
    code_challenge_method: 'S256',
    code_challenge: base64url(createHash('sha256').update(verifier).digest()),
  })
  if (store.clientId) {
    if (store.lastIdToken) params.set('id_token_hint', store.lastIdToken)
    if (store.lastEmail) params.set('login_hint', store.lastEmail)
  } else params.set('agent_name_hint', APP_NAME)
  return `${AUTH_ORIGIN}/api/accounts/authorize?${params}`
}

export async function finishSignIn(params: URLSearchParams) {
  const state = params.get('state') || ''
  const attempt = pending().get(state)
  pending().delete(state)
  if (!attempt || Date.now() - attempt.createdAt > PENDING_TTL) throw new ChatGPTError(serverT('signIn.expired'), 'invalid_state')
  if (params.get('error')) throw new ChatGPTError(serverT(params.get('error') === 'access_denied' ? 'signIn.cancelled' : 'signIn.failed'), params.get('error')!)
  const returnedClient = params.get('client_id')
  if (attempt.clientId !== 'dynamic_agent_client' && returnedClient && returnedClient !== attempt.clientId) throw new ChatGPTError(serverT('signIn.clientMismatch'), 'client_mismatch')
  const clientId = attempt.clientId === 'dynamic_agent_client' ? returnedClient : attempt.clientId
  if (!clientId || clientId === 'dynamic_agent_client') throw new ChatGPTError(serverT('signIn.registrationIncomplete'), 'registration_incomplete')
  const code = params.get('code')
  if (!code) throw new ChatGPTError(serverT('signIn.missingCode'), 'missing_code')
  const tokens = await tokenRequest({ grant_type: 'authorization_code', client_id: clientId, code, code_verifier: attempt.verifier, redirect_uri: attempt.redirectUri, resource: RESOURCE })
  const claims = await verifyIdToken(tokens.id_token, clientId, attempt.nonce)
  const store = await readStore()
  const account: Account = {
    email: typeof claims.email === 'string' ? claims.email : '',
    issuer: ISSUER,
    subject: String(claims.sub),
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || '',
    expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
    scopes: tokens.scope || '',
  }
  await writeStore({ ...store, clientId, account, lastIdToken: tokens.id_token, lastEmail: account.email })
  return attempt.returnTo
}

export async function signOut() {
  const store = await readStore()
  if (!store.account) return { revoked: true }
  let revoked = false
  if (store.account.refreshToken && store.clientId) {
    for (let attempt = 0; attempt < 3 && !revoked; attempt++) {
      try {
        const response = await fetch(`${AUTH_ORIGIN}/api/accounts/oauth/revoke`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: store.account.refreshToken, token_type_hint: 'refresh_token', client_id: store.clientId }) })
        revoked = response.ok
        if (response.status < 500) break
      } catch {}
      if (!revoked) await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt))
    }
  }
  await writeStore({ ...store, account: undefined })
  return { revoked }
}

export async function listModels(): Promise<ChatGPTModel[]> {
  const token = await accessToken()
  const response = await fetch(`${API_BASE}/models`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) throw await apiError(response)
  const body = await response.json() as { models?: { slug: string; display_name?: string; visibility?: string }[] }
  return (body.models || []).filter(m => m.visibility === 'list').map(m => ({ slug: m.slug, name: m.display_name || m.slug }))
}

export async function streamResponse(body: { model: string; instructions: string; input: { role: 'user' | 'assistant'; content: string }[] }, onText: (text: string) => void, signal: AbortSignal) {
  const token = await accessToken()
  const response = await fetch(`${API_BASE}/responses`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, store: false, stream: true }), signal })
  if (!response.ok || !response.body) throw await apiError(response)
  let text = ''; let completed = false; let buffer = ''
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() || ''
    for (const raw of events) {
      const data = raw.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
      if (!data || data === '[DONE]') continue
      const event = JSON.parse(data)
      if (event.type === 'response.output_text.delta') { text += event.delta; onText(event.delta) }
      if (event.type === 'response.completed') completed = true
      if (event.type === 'response.failed') throw errorFor(event.response?.error?.code || 'unknown_error', event.response?.error?.message)
      if (event.type === 'response.incomplete') throw new ChatGPTError(serverT('response.incomplete'), 'incomplete')
      if (event.type === 'error') throw errorFor(event.code || event.error?.code || 'unknown_error', event.message || event.error?.message)
    }
  }
  if (!completed) throw new ChatGPTError(serverT('response.interrupted'), 'stream_interrupted', 502)
  return text
}

type Account = { email: string; issuer: string; subject: string; idToken: string; accessToken: string; refreshToken: string; expiresAt: number; scopes: string }
type Store = { hostId?: string; clientId?: string; lastIdToken?: string; lastEmail?: string; account?: Account }
type Pending = { nonce: string; verifier: string; redirectUri: string; clientId: string; returnTo: string; createdAt: number }
type TokenResponse = { access_token: string; refresh_token?: string; id_token: string; expires_in?: number; scope?: string }

const TERMINAL_REFRESH_ERRORS = ['invalid_grant', 'invalid_refresh_token', 'token_expired', 'refresh_token_expired', 'refresh_token_invalidated', 'refresh_token_reused']

let refreshing: Promise<string> | null = null

async function accessToken() {
  const store = await readStore()
  if (!store.account) throw new ChatGPTError(serverT('session.notConnected'), 'not_connected', 401)
  if (!hasPlanScope(store.account.scopes)) throw new ChatGPTError(serverT('session.planDisabled'), 'plan_usage_disabled', 403)
  if (store.account.expiresAt - REFRESH_MARGIN * 1000 > Date.now()) return store.account.accessToken
  refreshing ||= refresh().finally(() => { refreshing = null })
  return refreshing
}

async function refresh() {
  const store = await readStore()
  const account = store.account
  if (!account || !store.clientId) throw new ChatGPTError(serverT('session.notConnected'), 'not_connected', 401)
  if (!account.refreshToken) throw new ChatGPTError(serverT('session.expired'), 'session_expired', 401)
  try {
    const tokens = await tokenRequest({ grant_type: 'refresh_token', client_id: store.clientId, refresh_token: account.refreshToken, resource: RESOURCE })
    const next: Account = { ...account, accessToken: tokens.access_token, refreshToken: tokens.refresh_token || account.refreshToken, expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000, scopes: tokens.scope || account.scopes, idToken: tokens.id_token || account.idToken }
    await writeStore({ ...store, account: next })
    return next.accessToken
  } catch (err) {
    if (err instanceof ChatGPTError && TERMINAL_REFRESH_ERRORS.includes(err.code)) {
      await writeStore({ ...store, account: undefined })
      throw new ChatGPTError(serverT('session.expired'), 'session_expired', 401)
    }
    throw err
  }
}

async function tokenRequest(fields: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(`${AUTH_ORIGIN}/api/accounts/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields) })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const code = typeof body.error === 'string' ? body.error : body.error?.code || 'token_error'
    if (code === 'invalid_client') throw new ChatGPTError(serverT('signIn.invalidClient'), code, 500)
    throw new ChatGPTError(serverT('signIn.notCompleted'), code, 400)
  }
  return body
}

async function verifyIdToken(idToken: string, clientId: string, nonce: string) {
  const [header64, payload64, signature64] = (idToken || '').split('.')
  if (!signature64) throw new ChatGPTError(serverT('signIn.invalidToken'), 'invalid_id_token')
  const header = JSON.parse(Buffer.from(header64, 'base64url').toString())
  const claims = JSON.parse(Buffer.from(payload64, 'base64url').toString())
  if (header.alg !== 'RS256') throw new ChatGPTError(serverT('signIn.invalidToken'), 'invalid_id_token')
  const jwks = await fetch(`${AUTH_ORIGIN}/.well-known/jwks.json`).then(r => r.json()) as { keys: (JsonWebKey & { kid?: string })[] }
  const jwk = jwks.keys.find(key => key.kid === header.kid)
  if (!jwk) throw new ChatGPTError(serverT('signIn.invalidToken'), 'invalid_id_token')
  const valid = verify('RSA-SHA256', Buffer.from(`${header64}.${payload64}`), createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(signature64, 'base64url'))
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!valid || claims.iss !== ISSUER || !audience.includes(clientId) || claims.exp * 1000 < Date.now() || claims.nonce !== nonce || !claims.sub) throw new ChatGPTError(serverT('signIn.invalidToken'), 'invalid_id_token')
  return claims
}

async function apiError(response: Response) {
  const body = await response.json().catch(() => null)
  const code = body?.error?.code || body?.code
  if (code) return errorFor(code, body?.error?.message)
  if (response.status === 401) return new ChatGPTError(serverT('response.unauthorized'), 'unauthorized', 401)
  if (response.status === 403) return new ChatGPTError(body?.detail || serverT('response.forbidden'), 'forbidden', 403)
  if (response.status === 503) return new ChatGPTError(serverT('response.unavailable'), 'unavailable', 503)
  return new ChatGPTError(serverT('response.failed', { status: response.status }), 'request_failed', response.status)
}

function errorFor(code: string, message?: string) {
  return new ChatGPTError(knownError(code) || message || serverT('response.unknown'), code, 502)
}

function hasPlanScope(scopes: string) {
  return scopes.split(/\s+/).includes(PLAN_SCOPE)
}

function isLoopbackHost(host: string) {
  const name = host.replace(/:\d+$/, '').replace(/^\[|\]$/g, '')
  return name === '127.0.0.1' || name === 'localhost' || name === '::1'
}

function pending() {
  const holder = globalThis as typeof globalThis & { __kioskChatGPTPending?: Map<string, Pending> }
  holder.__kioskChatGPTPending ||= new Map()
  return holder.__kioskChatGPTPending
}

function storePath() {
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
  return path.join(base, 'kiosk-slides', 'chatgpt.json')
}

async function readStore(): Promise<Store> {
  try { return JSON.parse(await readFile(storePath(), 'utf8')) } catch { return {} }
}

async function writeStore(store: Store) {
  const file = storePath()
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, JSON.stringify(store, null, 2), { mode: 0o600 })
  await chmod(temp, 0o600)
  try { await rename(temp, file) } catch (err) { await rm(temp, { force: true }); throw err }
}

function base64url(buffer: Buffer) {
  return buffer.toString('base64url')
}

function knownError(code: string) {
  const key = `codes.${code}` as Parameters<typeof serverT.has>[0]
  return serverT.has(key) ? serverT(key) : ''
}
