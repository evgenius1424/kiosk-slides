import { useEffect, useRef } from 'react'
import {
  addVersion,
  forgetVersions,
  loadHistory,
  saveHistory,
  takeVersion,
  type History,
} from '@/lib/history'

export type Versions = ReturnType<typeof useVersions>

export function useVersions() {
  const historyRef = useRef<History>({})
  useEffect(() => {
    historyRef.current = loadHistory()
  }, [])
  const keep = (history: History) => {
    historyRef.current = history
    saveHistory(history)
  }
  return {
    remember: (id: string, source: string) => keep(addVersion(historyRef.current, id, source)),
    forget: (id: string) => keep(forgetVersions(historyRef.current, id)),
    undo: (id: string, source: string) => {
      let taken = takeVersion(historyRef.current, id)
      while (taken && taken.source === source) taken = takeVersion(taken.history, id)
      if (!taken) return null
      keep(taken.history)
      return taken.source
    },
  }
}
