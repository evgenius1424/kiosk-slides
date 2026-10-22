import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Presentation, Slide } from '@/lib/presentation'
import {
  IDLE_MS,
  TRANSITION_MS,
  activeTransition,
  slideFromHash,
  slideHash,
  slideSeconds,
  slideTitle,
  type ActiveTransition,
} from '@/lib/player'
import { readShareHash, shareSlideHash } from '@/lib/share'
import { useWakeLock } from '../use-wake-lock'

export type Player = ReturnType<typeof usePlayer>

export function usePlayer(presentation: Presentation, notice: (message: string) => void) {
  const t = useTranslations('Workspace')
  const { slides, transition, duration, loop } = presentation
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [presenting, setPresenting] = useState(false)
  const [idle, setIdle] = useState(false)
  const [safeKey, setSafeKey] = useState<boolean | null>(null)
  const [jumped, setJumped] = useState<number | null>(null)
  if (jumped !== null && jumped !== index) setJumped(null)
  if (slides.length && index > slides.length - 1) setIndex(slides.length - 1)
  const safe = safeKey ?? presentation.shareSafe
  const at = Math.max(0, Math.min(index, slides.length - 1))
  const slide = slides[at] as Slide | undefined
  const motion = activeTransition(transition, safe)
  const change = useSlideChange(index, slide, jumped === index ? 'none' : motion)
  const slideName =
    slide && t('canvas.slide', { number: at + 1, count: slides.length, title: slideTitle(slide) })
  useWakeLock(presenting || playing)

  const go = useCallback((i: number) => {
    setPlaying(false)
    setIndex(i)
  }, [])
  const jump = useCallback((i: number) => {
    setPlaying(false)
    setIndex(i)
    setJumped(i)
  }, [])
  const move = useCallback(
    (delta: number) => {
      setPlaying(false)
      setIndex(i => Math.max(0, Math.min(slides.length - 1, i + delta)))
    },
    [slides.length],
  )
  const stop = () => setPlaying(false)
  const toggleAutoplay = () => {
    setPlaying(!playing)
    notice(t('toast.autoplay', { on: String(!playing) }))
  }
  const toggleSafe = () => {
    notice(t('toast.shareSafe', { on: String(!safe) }))
    setSafeKey(!safe)
  }
  const resetSafe = () => setSafeKey(null)
  const present = () => {
    setPresenting(true)
    setPlaying(false)
    ;(document.activeElement as HTMLElement)?.blur()
    enterFullscreen()
    notice(matchMedia('(hover: none)').matches ? t('toast.swipe') : t('toast.keys'))
  }
  const leave = () => {
    setPresenting(false)
    setPlaying(false)
    if (fullscreenElement()) exitFullscreen()
  }

  useEffect(() => {
    if (!playing || !slide) return
    const timer = setTimeout(
      () => {
        if (index === slides.length - 1 && !loop) {
          setPlaying(false)
          notice(t('toast.end'))
          return
        }
        setIndex(i => (i + 1) % slides.length)
      },
      slideSeconds(slide, duration) * 1000,
    )
    return () => clearTimeout(timer)
  }, [playing, index, slides.length, loop, duration, slide, notice, t])
  useEffect(() => {
    const exited = () => {
      if (!fullscreenElement()) {
        setPresenting(false)
        setPlaying(false)
      }
    }
    document.addEventListener('fullscreenchange', exited)
    document.addEventListener('webkitfullscreenchange', exited)
    return () => {
      document.removeEventListener('fullscreenchange', exited)
      document.removeEventListener('webkitfullscreenchange', exited)
    }
  }, [])
  useEffect(() => {
    if (!presenting) return
    let timer: ReturnType<typeof setTimeout>
    const wake = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), IDLE_MS)
    }
    wake()
    window.addEventListener('pointermove', wake)
    window.addEventListener('pointerdown', wake)
    return () => {
      window.removeEventListener('pointermove', wake)
      window.removeEventListener('pointerdown', wake)
      clearTimeout(timer)
      setIdle(false)
    }
  }, [presenting])

  return {
    index,
    at,
    slide,
    slideName,
    playing,
    presenting,
    idle,
    safe,
    motion,
    change,
    setIndex,
    go,
    jump,
    move,
    stop,
    toggleAutoplay,
    toggleSafe,
    resetSafe,
    present,
    leave,
  }
}

export function useSlideHash({
  at,
  count,
  ready,
  shared,
  go,
}: {
  at: number
  count: number
  ready: boolean
  shared: string | null
  go: (index: number) => void
}) {
  useEffect(() => {
    if (!ready) return
    const hash = shared ? shareSlideHash(shared, at) : slideHash(at)
    if (location.hash !== hash) history.replaceState(null, '', hash)
  }, [at, ready, shared])
  useEffect(() => {
    const follow = () => {
      const link = readShareHash(location.hash)
      if (link && link.payload !== shared) return location.reload()
      const target = slideFromHash(link?.slide ?? location.hash, count)
      if (target !== undefined) go(target)
    }
    window.addEventListener('hashchange', follow)
    return () => window.removeEventListener('hashchange', follow)
  }, [count, shared, go])
}

function useSlideChange(index: number, slide: Slide | undefined, motion: ActiveTransition) {
  const [change, setChange] = useState({
    index,
    slide,
    leaving: null as Slide | null,
    direction: 1,
    count: 0,
  })
  if (change.index !== index)
    setChange({
      index,
      slide,
      leaving: motion === 'none' ? null : (change.slide ?? null),
      direction: index < change.index ? -1 : 1,
      count: change.count + 1,
    })
  else if (change.slide !== slide) setChange({ ...change, slide })
  useEffect(() => {
    if (!change.leaving) return
    const timer = setTimeout(() => setChange(c => ({ ...c, leaving: null })), TRANSITION_MS[motion])
    return () => clearTimeout(timer)
  }, [change.count, change.leaving, motion])
  return change
}

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element
  webkitExitFullscreen?: () => void
}
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => void }

function fullscreenElement() {
  return document.fullscreenElement ?? (document as WebkitDocument).webkitFullscreenElement ?? null
}

function enterFullscreen() {
  const root = document.documentElement as WebkitElement
  if (root.requestFullscreen) root.requestFullscreen().catch(() => {})
  else root.webkitRequestFullscreen?.()
}

function exitFullscreen() {
  if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
  else (document as WebkitDocument).webkitExitFullscreen?.()
}
