'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import type { Presentation, PresentationLook } from '@/lib/presentation'
import { SETTLE_MS, SWIPE, WHEEL, swipeDelta } from '@/lib/player'
import { SlideView } from '../slide'
import type { Player } from './use-player'

export function useCanvas({ player, preview }: { player: Player; preview: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const { move, presenting } = player
  useEffect(() => {
    const target = ref.current
    if (!target) return
    let total = 0
    let locked = false
    let timer: ReturnType<typeof setTimeout>
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      clearTimeout(timer)
      timer = setTimeout(() => {
        locked = false
        total = 0
      }, WHEEL.settleMs)
      if (locked) return
      total += event.deltaY * (event.deltaMode === 1 ? WHEEL.lineHeight : 1)
      if (Math.abs(total) > WHEEL.distance) {
        move(Math.sign(total))
        total = 0
        locked = true
      }
    }
    const stopSwipe = onSwipe(target, move, presenting)
    target.addEventListener('wheel', wheel, { passive: false })
    return () => {
      target.removeEventListener('wheel', wheel)
      stopSwipe()
      clearTimeout(timer)
    }
  }, [move, preview, presenting])
  useEffect(() => {
    const target = ref.current
    if (target) return hideWhileResizing(target)
  }, [preview])
  return { ref }
}

export function SlideCanvas({
  canvasRef,
  player,
  presentation,
  look,
  working,
  actions,
  onPresent,
}: {
  canvasRef: RefObject<HTMLDivElement | null>
  player: Player
  presentation: Presentation
  look: PresentationLook
  working: boolean
  actions: ReactNode
  onPresent: () => void
}) {
  const t = useTranslations('Workspace')
  const ta = useTranslations('SlideActions')
  const { theme, tone: accent, slides } = presentation
  const { change, index, slide, presenting } = player
  return (
    <>
      <div
        ref={canvasRef}
        className={`canvas-shell slide-backdrop ${theme}`}
        data-transition={player.motion}
        style={{ '--slide-tone': accent, '--kt-dir': change.direction } as CSSProperties}
        onClick={player.stop}
      >
        {change.leaving && (
          <div
            key={`leave-${change.count}`}
            className="canvas-slide kt-leave"
            aria-hidden="true"
            inert
          >
            <SlideView slide={change.leaving} theme={theme} accent={accent} look={look} />
          </div>
        )}
        <div
          key={`slide-${index}`}
          className={`canvas-slide ${change.leaving ? 'kt-enter' : ''}`}
          role="region"
          aria-roledescription="slide"
          aria-label={player.slideName}
        >
          {slide ? (
            <SlideView slide={slide} theme={theme} accent={accent} look={look} />
          ) : (
            <p className="canvas-empty">{t('canvas.empty')}</p>
          )}
        </div>
        {working && (
          <div className="slide-working" role="status">
            <span className="chat-spinner" />
            {ta('working')}
          </div>
        )}
      </div>
      <div className="canvas-controls">
        <span>
          <span className="status-dot" />
          {presenting ? t('canvas.presenting') : '16:9'}
          <span className="control-separator">/</span>
          {t(`themes.${theme}`)}
        </span>
        <div className="slide-pagination">
          <button
            className="icon-btn"
            aria-label={t('canvas.previous')}
            onClick={() => player.move(-1)}
            disabled={index === 0}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            {String(index + 1).padStart(2, '0')}{' '}
            <span>/ {String(slides.length).padStart(2, '0')}</span>
          </span>
          <button
            className="icon-btn"
            aria-label={t('canvas.next')}
            onClick={() => player.move(1)}
            disabled={index === slides.length - 1}
          >
            <ChevronRight size={17} />
          </button>
        </div>
        <button className="icon-btn" aria-label={t('canvas.enter')} onClick={onPresent}>
          <Expand size={16} />
        </button>
      </div>
      {actions}
      {presenting && (
        <button className="present-exit" aria-label={t('canvas.leave')} onClick={player.leave}>
          <X size={20} />
        </button>
      )}
    </>
  )
}

function hideWhileResizing(target: HTMLElement) {
  let measured = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const observer = new ResizeObserver(() => {
    if (!measured) return void (measured = true)
    target.dataset.settling = ''
    clearTimeout(timer)
    timer = setTimeout(() => delete target.dataset.settling, SETTLE_MS)
  })
  observer.observe(target)
  return () => {
    observer.disconnect()
    clearTimeout(timer)
    delete target.dataset.settling
  }
}

function onSwipe(target: HTMLElement, move: (delta: number) => void, vertical: boolean) {
  let start: { x: number; y: number } | null = null
  const down = (event: TouchEvent) => {
    start =
      event.touches.length === 1
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
        : null
  }
  const up = (event: TouchEvent) => {
    if (!start) return
    const dx = event.changedTouches[0].clientX - start.x
    const dy = event.changedTouches[0].clientY - start.y
    start = null
    const distance = swipeDelta(dx, dy, vertical)
    if (Math.abs(distance) > SWIPE.distance) move(distance < 0 ? 1 : -1)
  }
  target.addEventListener('touchstart', down, { passive: true })
  target.addEventListener('touchend', up)
  return () => {
    target.removeEventListener('touchstart', down)
    target.removeEventListener('touchend', up)
  }
}
