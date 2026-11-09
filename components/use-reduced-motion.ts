import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(QUERY).matches ?? false,
    () => false,
  )
}

function subscribe(callback: () => void) {
  const query = window.matchMedia?.(QUERY)
  query?.addEventListener('change', callback)
  return () => query?.removeEventListener('change', callback)
}
