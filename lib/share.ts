// A share link carries the whole presentation after the `#`, so nothing reaches a server:
// `#s=1<base64url(deflate-raw(markdown))>`, where `1` is the encoding version.
// While a share link is open, the slide number follows as `&N`: `#s=1…&3`.

export const SHARE_PREFIX = '#s='
export const SHARE_LIMIT = 16_000

const VERSION = '1'
const BROKEN_LINK = 'Broken share link'

export type ShareLink = { url: string } | { tooBig: true }

export async function shareLink(markdown: string, site: string): Promise<ShareLink> {
  if (/\bdata:[\w/+.-]+;base64,/i.test(markdown)) return { tooBig: true }
  const url = `${site.replace(/\/$/, '')}/${SHARE_PREFIX}${await encodeShare(markdown)}`
  return url.length > SHARE_LIMIT ? { tooBig: true } : { url }
}

export async function encodeShare(markdown: string) {
  const bytes = await pipe(new TextEncoder().encode(markdown), new CompressionStream('deflate-raw'))
  return VERSION + toBase64Url(bytes)
}

export async function decodeShare(payload: string) {
  try {
    if (!payload.startsWith(VERSION)) throw new Error()
    const bytes = await pipe(
      fromBase64Url(payload.slice(1)),
      new DecompressionStream('deflate-raw'),
    )
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error(BROKEN_LINK)
  }
}

export function readShareHash(hash: string) {
  if (!hash.startsWith(SHARE_PREFIX)) return
  const [payload, slide] = hash.slice(SHARE_PREFIX.length).split('&')
  return { payload, slide: slide ? `#${slide}` : '' }
}

export function shareSlideHash(payload: string, index: number) {
  return `${SHARE_PREFIX}${payload}${index ? `&${index + 1}` : ''}`
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const writer = stream.writable.getWriter()
  writer.write(bytes as Uint8Array<ArrayBuffer>).catch(() => {})
  writer.close().catch(() => {})
  return new Uint8Array(await new Response(stream.readable).arrayBuffer())
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string) {
  if (!/^[\w-]*$/.test(text)) throw new Error(BROKEN_LINK)
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, c => c.charCodeAt(0))
}
