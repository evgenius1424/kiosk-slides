import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runInNewContext } from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PAGE_TIMEOUT_MS, offlineAssets, serviceWorker } from '@/lib/offline'

const ORIGIN = 'https://kiosk.test'
const URLS = ['/', '/_next/static/chunks/app.js', '/fonts/inter.woff2']

afterEach(() => {
  vi.useRealTimers()
})

describe('offline assets', () => {
  it('lists the page, every built file and the public files except Markdown', async () => {
    const root = site()
    const { urls } = await offlineAssets(root)
    expect(urls).toEqual([
      '/',
      '/manifest.webmanifest',
      '/_next/static/build/_buildManifest.js',
      '/_next/static/chunks/app.js',
      '/fonts/inter.woff2',
      '/icon.svg',
    ])
  })

  it('changes the version when a public file changes', async () => {
    const root = site()
    const before = (await offlineAssets(root)).version
    writeFileSync(path.join(root, 'public/fonts/inter.woff2'), 'new font')
    expect((await offlineAssets(root)).version).not.toBe(before)
  })

  it('works without a build', async () => {
    const { urls } = await offlineAssets(mkdtempSync(path.join(tmpdir(), 'kiosk-')))
    expect(urls).toEqual(['/', '/manifest.webmanifest'])
  })
})

describe('service worker', () => {
  it('precaches every asset on install', async () => {
    const worker = install(() => Promise.reject(new TypeError('offline')))
    await worker.installed
    expect([...worker.cached.keys()].sort()).toEqual([...URLS].sort())
  })

  it('never answers the AI or sign-in routes', async () => {
    const worker = install(() => Promise.reject(new TypeError('offline')))
    expect(worker.request('/api/chat')).toBeUndefined()
    expect(worker.request('/api/chat', { method: 'POST' })).toBeUndefined()
    expect(worker.request('/auth/callback', { mode: 'navigate' })).toBeUndefined()
  })

  it('opens the cached page when offline', async () => {
    const worker = install(() => Promise.reject(new TypeError('offline')))
    await worker.installed
    expect(await text(worker.request('/?chatgpt=connected', { mode: 'navigate' }))).toBe('/')
  })

  it('prefers the network for the page when it answers', async () => {
    const worker = install(url => Promise.resolve(new Response(`fresh ${url}`)))
    await worker.installed
    expect(await text(worker.request('/', { mode: 'navigate' }))).toBe(`fresh ${ORIGIN}/`)
  })

  it('falls back to the cached page when the network hangs', async () => {
    let online = true
    const worker = install(url =>
      online ? Promise.resolve(new Response(url)) : new Promise<Response>(() => {}),
    )
    await worker.installed
    online = false
    vi.useFakeTimers()
    const response = worker.request('/', { mode: 'navigate' })
    await vi.advanceTimersByTimeAsync(PAGE_TIMEOUT_MS)
    expect(await text(response)).toBe('/')
  })

  it('serves built files from the cache, ignoring the query', async () => {
    const worker = install(() => Promise.reject(new TypeError('offline')))
    await worker.installed
    expect(await text(worker.request('/_next/static/chunks/app.js?dpl=abc'))).toBe(
      '/_next/static/chunks/app.js',
    )
  })
})

function site() {
  const root = mkdtempSync(path.join(tmpdir(), 'kiosk-'))
  for (const [file, body] of [
    ['.next/static/chunks/app.js', 'app'],
    ['.next/static/build/_buildManifest.js', 'manifest'],
    ['public/fonts/inter.woff2', 'font'],
    ['public/icon.svg', '<svg/>'],
    ['public/example.md', '# Example'],
  ]) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    writeFileSync(path.join(root, file), body)
  }
  return root
}

function install(network: (url: string) => Promise<Response>) {
  const listeners = new Map<string, (event: unknown) => void>()
  const cached = new Map<string, Response>()
  const cache = {
    addAll: async (requests: { url: string }[]) => {
      for (const r of requests)
        cached.set(new URL(r.url).pathname, new Response(new URL(r.url).pathname))
    },
    match: async (request: { url: string } | string, options?: { ignoreSearch?: boolean }) => {
      const url = new URL(typeof request === 'string' ? request : request.url, ORIGIN)
      const key =
        options?.ignoreSearch || typeof request === 'string'
          ? url.pathname
          : url.pathname + url.search
      return cached.get(key)?.clone()
    },
  }
  const self = {
    location: { origin: ORIGIN },
    clients: { claim: async () => {} },
    addEventListener: (type: string, listener: (event: unknown) => void) =>
      listeners.set(type, listener),
  }
  runInNewContext(serviceWorker('test', URLS), {
    self,
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    fetch: (request: Request) => network(request.url),
    Request: class {
      url: string
      constructor(url: string) {
        this.url = new URL(url, ORIGIN).href
      }
    },
    URL,
    Set,
    Promise,
    setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms),
  })
  let installed: Promise<unknown> = Promise.resolve()
  listeners.get('install')!({ waitUntil: (p: Promise<unknown>) => (installed = p) })
  return {
    cached,
    installed,
    request(url: string, init: { method?: string; mode?: string } = {}) {
      let response: Promise<Response> | undefined
      const request = {
        url: `${ORIGIN}${url}`,
        method: init.method ?? 'GET',
        mode: init.mode ?? 'cors',
      }
      listeners.get('fetch')!({ request, respondWith: (r: Promise<Response>) => (response = r) })
      return response
    },
  }
}

async function text(response: Promise<Response> | undefined) {
  return (await response)!.text()
}
