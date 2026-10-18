import { useEffect, useRef } from 'react'
import { playerAction, type PlayerAction } from '@/lib/player'

type Shortcuts = {
  enabled: boolean
  preview: boolean
  onEscape: () => void
  onUndo: () => void
  onPlayer: (action: PlayerAction) => void
}

export function useShortcuts(shortcuts: Shortcuts) {
  const ref = useRef(shortcuts)
  useEffect(() => {
    ref.current = shortcuts
  })
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const { enabled, preview, onEscape, onUndo, onPlayer } = ref.current
      if (event.isComposing || event.keyCode === 229) return
      if (!enabled) return
      if (event.key === 'Escape') return onEscape()
      const target = event.target as HTMLElement
      const fromList = !!target.closest('.slide-list')
      if (target.closest('input,textarea,select,dialog')) return
      if ((target.closest('button') && !fromList) || (!preview && !fromList)) return
      if (isUndo(event)) {
        event.preventDefault()
        return onUndo()
      }
      if (fromList) return
      const action = playerAction(event)
      if (!action) return
      event.preventDefault()
      onPlayer(action)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}

function isUndo(event: KeyboardEvent) {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === 'z'
  )
}
