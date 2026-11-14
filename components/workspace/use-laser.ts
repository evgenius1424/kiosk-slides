import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { startLaser, type Laser } from '@/lib/laser'

export type LaserControl = ReturnType<typeof useLaser>

export function useLaser(presenting: boolean, notice: (message: string) => void) {
  const t = useTranslations('Workspace')
  const [layer, setLayer] = useState<HTMLCanvasElement | null>(null)
  const laser = useRef<Laser | null>(null)
  useEffect(() => {
    const host = layer?.parentElement
    if (!presenting || !layer || !host) return
    const started = startLaser(layer, host)
    laser.current = started
    return () => {
      started.stop()
      laser.current = null
    }
  }, [presenting, layer])
  const toggle = useCallback(() => {
    if (!laser.current) return
    notice(t('toast.laser', { on: String(laser.current.toggle()) }))
  }, [notice, t])
  return { setLayer, toggle }
}
