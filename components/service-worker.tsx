'use client'

import { useEffect } from 'react'

export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV === 'production')
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    else
      navigator.serviceWorker
        .getRegistrations()
        .then(list => list.forEach(registration => registration.unregister()))
  }, [])
  return null
}
