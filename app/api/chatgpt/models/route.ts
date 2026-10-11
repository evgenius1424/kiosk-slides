import { ChatGPTError, checkLocalRequest, listModels } from '@/lib/chatgpt'
import { serverT } from '@/i18n/server'

export async function GET(request: Request) {
  const reason = checkLocalRequest(request)
  if (reason) return Response.json({ error: reason }, { status: 403 })
  try { return Response.json({ models: await listModels() }, { headers: { 'Cache-Control': 'no-store' } }) }
  catch (err) { return Response.json({ error: err instanceof ChatGPTError ? err.message : serverT('modelsFailed') }, { status: err instanceof ChatGPTError ? err.status : 500 }) }
}
