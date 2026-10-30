import { useCallback, useEffect, useReducer, useState } from 'react'
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

export type PlayerState = {
  index: number
  playing: boolean
  presenting: boolean
  idle: boolean
  safeKey: boolean | null
  jumped: number | null
}

export type PlayerEvent =
  | { type: 'go' | 'jump' | 'show'; index: number }
  | { type: 'move'; delta: number; count: number }
  | { type: 'settle'; count: number }
  | { type: 'tick'; count: number; loop: boolean }
  | { type: 'autoplay' | 'stop' | 'present' | 'leave' }
  | { type: 'idle'; idle: boolean }
  | { type: 'safe'; safe: boolean | null }

export const INITIAL_PLAYER: PlayerState = {
  index: 0,
  playing: false,
  presenting: false,
  idle: false,
  safeKey: null,
  jumped: null,
}

export function usePlayer(presentation: Presentation, notice: (message: string) => void) {
  const t = useTranslations('Workspace')
  const { slides, transition, duration, loop } = presentation
  const [state, dispatch] = useReducer(playerReducer, INITIAL_PLAYER)
  const { index, playing, presenting, idle, safeKey, jumped } = state
  if (slides.length && index > slides.length - 1) dispatch({ type: 'settle', count: slides.length })
  const safe = safeKey ?? presentation.shareSafe
  const at = Math.max(0, Math.min(index, slides.length - 1))
  const slide = slides[at] as Slide | undefined
  const motion = activeTransition(transition, safe)
  const change = useSlideChange(index, slide, jumped === index ? 'none' : motion)
  const slideName =
    slide && t('canvas.slide', { number: at + 1, count: slides.length, title: slideTitle(slide) })
  useWakeLock(presenting || playing)

  const go = useCallback((i: number) => dispatch({ type: 'go', index: i }), [])
  const jump = useCallback((i: number) => dispatch({ type: 'jump', index: i }), [])
  const move = useCallback(
    (delta: number) => dispatch({ type: 'move', delta, count: slides.length }),
    [slides.length],
  )
  const setIndex = useCallback((i: number) => dispatch({ type: 'show', index: i }), [])
  const stop = () => dispatch({ type: 'stop' })
  const toggleAutoplay = () => {
    dispatch({ type: 'autoplay' })
    notice(t('toast.autoplay', { on: String(!playing) }))
  }
  const toggleSafe = () => {
    notice(t('toast.shareSafe', { on: String(!safe) }))
    dispatch({ type: 'safe', safe: !safe })
  }
  const resetSafe = () => dispatch({ type: 'safe', safe: null })
  const present = () => {
    dispatch({ type: 'present' })
    ;(document.activeElement as HTMLElement)?.blur()
    enterFullscreen()
    notice(matchMedia('(hover: none)').matches ? t('toast.swipe') : t('toast.keys'))
  }
  const leave = () => {
    dispatch({ type: 'leave' })
    if (fullscreenElement()) exitFullscreen()
  }

  useEffect(() => {
    if (!playing || !slide) return
    const timer = setTimeout(
      () => {
        dispatch({ type: 'tick', count: slides.length, loop })
        if (index === slides.length - 1 && !loop) notice(t('toast.end'))
      },
      slideSeconds(slide, duration) * 1000,
    )
    return () => clearTimeout(timer)
  }, [playing, index, slides.length, loop, duration, slide, notice, t])
  useEffect(() => {
    const exited = () => {
      if (!fullscreenElement()) dispatch({ type: 'leave' })
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
      dispatch({ type: 'idle', idle: false })
      clearTimeout(timer)
      timer = setTimeout(() => dispatch({ type: 'idle', idle: true }), IDLE_MS)
    }
    wake()
    window.addEventListener('pointermove', wake)
    window.addEventListener('pointerdown', wake)
    return () => {
      window.removeEventListener('pointermove', wake)
      window.removeEventListener('pointerdown', wake)
      clearTimeout(timer)
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

export function playerReducer(state: PlayerState, event: PlayerEvent): PlayerState {
  switch (event.type) {
    case 'go':
      return landOn(state, event.index, false)
    case 'jump':
      return { ...landOn(state, event.index, false), jumped: event.index }
    case 'show':
      return landOn(state, event.index, state.playing)
    case 'move':
      return landOn(state, Math.max(0, Math.min(event.count - 1, state.index + event.delta)), false)
    case 'settle':
      return landOn(state, event.count - 1, state.playing)
    case 'tick':
      if (state.index === event.count - 1 && !event.loop) return { ...state, playing: false }
      return landOn(state, (state.index + 1) % event.count, true)
    case 'autoplay':
      return { ...state, playing: !state.playing }
    case 'stop':
      return { ...state, playing: false }
    case 'present':
      return { ...state, presenting: true, playing: false }
    case 'leave':
      return { ...state, presenting: false, playing: false, idle: false }
    case 'idle':
      return { ...state, idle: event.idle }
    case 'safe':
      return { ...state, safeKey: event.safe }
  }
}

function landOn(state: PlayerState, index: number, playing: boolean): PlayerState {
  return { ...state, index, playing, jumped: state.jumped === index ? index : null }
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
