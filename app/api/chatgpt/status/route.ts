import { checkLocalRequest, getStatus } from '@/lib/chatgpt'

export async function GET(request: Request) {
  const reason = checkLocalRequest(request)
  if (reason) return Response.json({ available: false, reason })
  return Response.json(await getStatus(), { headers: { 'Cache-Control': 'no-store' } })
}
