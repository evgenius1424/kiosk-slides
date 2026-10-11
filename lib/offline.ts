import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export const NEVER_CACHED = ['/api/', '/auth/']
export const PAGE_TIMEOUT_MS = 4000

export async function offlineAssets(root: string) {
  const [statics, publics] = await Promise.all([
    files(path.join(root, '.next/static')),
    files(path.join(root, 'public')),
  ])
  const shipped = publics.filter(file => !file.endsWith('.md'))
  const hash = createHash('sha256')
  for (const file of statics) hash.update(file)
  for (const file of shipped)
    hash.update(file).update(await readFile(path.join(root, 'public', file)))
  return {
    version: hash.digest('hex').slice(0, 12),
    urls: [
      '/',
      '/manifest.webmanifest',
      ...statics.map(file => `/_next/static/${file}`),
      ...shipped.map(file => `/${file}`),
    ],
  }
}

export function serviceWorker(version: string, urls: string[]) {
  return `const CACHE=${JSON.stringify(`kiosk-${version}`)},ASSETS=new Set(${JSON.stringify(urls)}),NEVER=${JSON.stringify(NEVER_CACHED)};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll([...ASSETS].map(u=>new Request(u,{cache:'reload'})))))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kiosk-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);
if(e.request.method!=='GET'||url.origin!==self.location.origin||NEVER.some(p=>url.pathname.startsWith(p)))return;
if(e.request.mode==='navigate'){if(url.pathname==='/')e.respondWith(page(e.request));return}
if(ASSETS.has(url.pathname))e.respondWith(asset(e.request))});
async function page(request){const network=fetch(request),cached=await caches.open(CACHE).then(c=>c.match('/'));
if(!cached)return network;
return Promise.race([network.then(r=>r.ok?r:cached),new Promise(r=>setTimeout(()=>r(cached),${PAGE_TIMEOUT_MS}))]).catch(()=>cached)}
async function asset(request){const cached=await caches.open(CACHE).then(c=>c.match(request,{ignoreSearch:true}));return cached||fetch(request)}
`
}

async function files(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true })
    return entries
      .filter(entry => entry.isFile())
      .map(entry =>
        path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'),
      )
      .sort()
  } catch {
    return []
  }
}
