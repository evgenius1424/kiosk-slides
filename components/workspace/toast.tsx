'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Check } from 'lucide-react'

export type ToastAction = { label: string; run: () => void }
export type Notice = (message: string, action?: ToastAction) => void

const TOAST_MS = 2600
const UNDO_MS = 8000

type Message = { message: string; action?: ToastAction }

export function useToast() {
  const [toast, setToast] = useState<Message | null>(null)
  const [heldFor, setHeldFor] = useState<Message | null>(null)
  const hidden = usePageHidden()
  const left = useRef(0)
  const notice = useCallback<Notice>((message, action) => setToast({ message, action }), [])
  const held = !!toast && heldFor === toast
  useEffect(() => {
    left.current = toast?.action ? UNDO_MS : TOAST_MS
  }, [toast])
  useEffect(() => {
    if (!toast || held || hidden) return
    const started = Date.now()
    const timer = setTimeout(() => setToast(null), left.current)
    return () => {
      clearTimeout(timer)
      left.current -= Date.now() - started
    }
  }, [toast, held, hidden])
  return {
    toast,
    notice,
    dismiss: () => setToast(null),
    hold: (on: boolean) => setHeldFor(on ? toast : null),
  }
}

export function Toast({
  toast,
  onDismiss,
  onHold,
}: {
  toast: Message | null
  onDismiss: () => void
  onHold: (on: boolean) => void
}) {
  if (!toast) return null
  return (
    <div
      className="toast"
      role="status"
      onPointerEnter={event => event.pointerType === 'mouse' && onHold(true)}
      onPointerLeave={() => onHold(false)}
    >
      <Check size={15} />
      {toast.message}
      {toast.action && (
        <button
          className="toast-action"
          onClick={() => {
            toast.action!.run()
            onDismiss()
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  )
}

function usePageHidden() {
  return useSyncExternalStore(
    change => {
      document.addEventListener('visibilitychange', change)
      return () => document.removeEventListener('visibilitychange', change)
    },
    () => document.visibilityState === 'hidden',
    () => false,
  )
}
