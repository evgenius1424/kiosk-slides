import { offlineAssets, serviceWorker } from '@/lib/offline'

export const dynamic = 'force-static'

export async function GET() {
  const { version, urls } = await offlineAssets(process.cwd())
  return new Response(serviceWorker(version, urls), {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
  })
}
