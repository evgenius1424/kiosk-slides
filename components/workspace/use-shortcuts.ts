import { useEffect, useEffectEvent } from 'react'
import { playerAction, type PlayerAction } from '@/lib/player'

export type SlideKey = 'add' | 'duplicate' | 'up' | 'down'

type Shortcuts = {
  enabled: boolean
  preview: boolean
  onEscape: () => void
  onUndo: () => void
  onRedo: () => void
  onSlide: (key: SlideKey) => void
  onPlayer: (action: PlayerAction) => void
}

export function useShortcuts(shortcuts: Shortcuts) {
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    const { enabled, preview, onEscape, onUndo, onRedo, onSlide, onPlayer } = shortcuts
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
    if (isRedo(event)) {
      event.preventDefault()
      return onRedo()
    }
    const key = slideKey(event, fromList)
    if (key) {
      event.preventDefault()
      return onSlide(key)
    }
    if (fromList) return
    const action = playerAction(event)
    if (!action) return
    event.preventDefault()
    onPlayer(action)
  })
  useEffect(() => {
    const handler = (event: KeyboardEvent) => onKey(event)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}

function isUndo(event: KeyboardEvent) {
  return command(event) && !event.shiftKey && event.key.toLowerCase() === 'z'
}

function isRedo(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  return command(event) && (event.shiftKey ? key === 'z' : event.ctrlKey && key === 'y')
}

function slideKey(event: KeyboardEvent, fromList: boolean): SlideKey | undefined {
  if (!command(event) || event.shiftKey) return
  if (event.key === 'Enter') return 'add'
  if (event.key.toLowerCase() === 'd') return 'duplicate'
  if (!fromList) return
  if (event.key === 'ArrowUp') return 'up'
  if (event.key === 'ArrowDown') return 'down'
}

function command(event: KeyboardEvent) {
  return (event.metaKey || event.ctrlKey) && !event.altKey
}
