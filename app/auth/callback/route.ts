import { ChatGPTError, checkLocalRequest, finishSignIn } from '@/lib/chatgpt'
import { serverT } from '@/i18n/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const reason = checkLocalRequest(request)
  if (reason) return new Response(reason, { status: 403 })
  try {
    const returnTo = new URL(await finishSignIn(url.searchParams))
    returnTo.searchParams.set('chatgpt', 'connected')
    return Response.redirect(returnTo, 303)
  } catch (err) {
    const home = new URL('/', url)
    home.searchParams.set('chatgpt_error', err instanceof ChatGPTError ? err.message : serverT('signIn.failed'))
    return Response.redirect(home, 303)
  }
}
