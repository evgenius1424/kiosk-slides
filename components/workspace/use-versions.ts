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
  const redoRef = useRef<Record<string, Redo[]>>({})
  useEffect(() => {
    historyRef.current = loadHistory()
  }, [])
  const keep = (history: History) => {
    historyRef.current = history
    saveHistory(history)
  }
  const setRedo = (id: string, redo: Redo[]) => {
    redoRef.current = { ...redoRef.current, [id]: redo }
  }
  return {
    remember: (id: string, source: string) => {
      setRedo(id, [])
      keep(addVersion(historyRef.current, id, source))
    },
    forget: (id: string) => {
      setRedo(id, [])
      keep(forgetVersions(historyRef.current, id))
    },
    undo: (id: string, source: string) => {
      let taken = takeVersion(historyRef.current, id)
      while (taken && taken.source === source) taken = takeVersion(taken.history, id)
      if (!taken) return null
      keep(taken.history)
      setRedo(id, [...(redoRef.current[id] ?? []), { source, from: taken.source }])
      return taken.source
    },
    redo: (id: string, source: string) => {
      const redo = redoRef.current[id] ?? []
      const next = redo.at(-1)
      if (!next || next.from !== source) {
        setRedo(id, [])
        return null
      }
      setRedo(id, redo.slice(0, -1))
      keep(addVersion(historyRef.current, id, source))
      return next.source
    },
  }
}

type Redo = { source: string; from: string }
