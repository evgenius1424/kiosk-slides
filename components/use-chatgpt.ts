import { useState } from 'react'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ChatGPTModel,
  MODEL_KEY,
  connectChatGPT,
  disconnectChatGPT,
  fetchModels,
  fetchStatus,
} from '@/lib/chat'
import { useOnline } from './use-online'

export const statusQuery = queryOptions({
  queryKey: ['chatgpt', 'status'],
  queryFn: fetchStatus,
  retry: false,
  staleTime: 60_000,
})

export const modelsQuery = queryOptions({
  queryKey: ['chatgpt', 'models'],
  queryFn: fetchModels,
  retry: false,
  staleTime: Infinity,
})

export function useChatGPTStatus() {
  const online = useOnline()
  return useQuery({ ...statusQuery, enabled: online })
}

export function useModels(enabled: boolean) {
  return useQuery({ ...modelsQuery, enabled })
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

export function useDisconnect() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: disconnectChatGPT,
    onSettled: () => {
      client.removeQueries({ queryKey: modelsQuery.queryKey })
      return client.invalidateQueries({ queryKey: statusQuery.queryKey })
    },
  })
}

export function preferredModel(models: ChatGPTModel[], picked?: string | null) {
  const wanted = picked ?? savedModel()
  return models.some(m => m.slug === wanted) ? wanted! : (models[0]?.slug ?? '')
}

function savedModel() {
  try {
    return localStorage.getItem(MODEL_KEY)
  } catch {
    return null
  }
}
