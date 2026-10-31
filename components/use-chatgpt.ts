import { useEffect, useState } from 'react'
import { type ChatGPTModel, MODEL_KEY, connectChatGPT, fetchModels, fetchStatus } from '@/lib/chat'
import { useOnline } from './use-online'

const lastData = new Map<() => Promise<unknown>, unknown>()

export function useChatGPTStatus() {
  return useRequest(fetchStatus, useOnline())
}

export function useModels(enabled: boolean) {
  return useRequest(fetchModels, enabled)
}

export function useConnect(onError: (err: unknown) => void) {
  const [connecting, setConnecting] = useState(false)
  const connect = async () => {
    setConnecting(true)
    try {
      await connectChatGPT()
    } catch (err) {
      setConnecting(false)
      onError(err)
    }
  }
  return { connect, connecting }
}

export function preferredModel(models: ChatGPTModel[], picked?: string | null) {
  const wanted = picked ?? savedModel()
  return models.some(m => m.slug === wanted) ? wanted! : (models[0]?.slug ?? '')
}

function useRequest<T>(load: () => Promise<T>, enabled: boolean) {
  const [result, setResult] = useState<{ data?: T; error?: unknown }>(() =>
    lastData.has(load) ? { data: lastData.get(load) as T } : {},
  )
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let current = true
    load().then(
      data => {
        lastData.set(load, data)
        if (current) setResult({ data })
      },
      error => current && setResult(r => ({ ...r, error })),
    )
    return () => {
      current = false
    }
  }, [load, enabled, attempt])
  return { ...(enabled ? result : {}), refetch: () => setAttempt(a => a + 1) }
}

function savedModel() {
  try {
    return localStorage.getItem(MODEL_KEY)
  } catch {
    return null
  }
}
