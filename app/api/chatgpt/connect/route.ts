import { checkLocalRequest, startSignIn } from '@/lib/chatgpt'

export async function POST(request: Request) {
  const reason = checkLocalRequest(request, { mutating: true })
  if (reason) return Response.json({ error: reason }, { status: 403 })
  return Response.json({ url: await startSignIn(request) })
}
