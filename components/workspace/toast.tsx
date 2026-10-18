'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check } from 'lucide-react'

export type ToastAction = { label: string; run: () => void }
export type Notice = (message: string, action?: ToastAction) => void

const TOAST_MS = 2600
const UNDO_MS = 8000

type Message = { message: string; action?: ToastAction }

export function useToast() {
  const [toast, setToast] = useState<Message | null>(null)
  const notice = useCallback<Notice>((message, action) => setToast({ message, action }), [])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), toast.action ? UNDO_MS : TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])
  return { toast, notice, dismiss: () => setToast(null) }
}

export function Toast({ toast, onDismiss }: { toast: Message | null; onDismiss: () => void }) {
  if (!toast) return null
  return (
    <div className="toast" role="status">
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
