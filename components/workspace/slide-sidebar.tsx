'use client'

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react'
import { useTranslations } from 'next-intl'
import { PanelLeftClose, Plus } from 'lucide-react'
import type { Presentation, PresentationLook } from '@/lib/presentation'
import { SlideView } from '../slide'

export type SlideMenuAt = { x: number; y: number; index: number }

const DRAG_PX = 5
const LONG_PRESS_MS = 350
const EDGE_PX = 36

export function SlideSidebar({
  presentation,
  look,
  index,
  changing,
  editable,
  readOnly,
  onSelect,
  onDelete,
  onMove,
  onMenu,
  onAdd,
  onHide,
}: {
  presentation: Presentation
  look: PresentationLook
  index: number
  changing?: number
  editable: boolean
  readOnly: boolean
  onSelect: (index: number) => void
  onDelete: (index: number) => void
  onMove: (from: number, to: number) => void
  onMenu: (at: SlideMenuAt) => void
  onAdd: () => void
  onHide: () => void
}) {
  const t = useTranslations('Workspace')
  const { slides, theme, tone: accent } = presentation
  const listRef = useRef<HTMLElement>(null)
  const drag = useSlideDrag(listRef, editable, onMove, onMenu)
  return (
    <aside className="slides-sidebar">
      <div className="sidebar-heading">
        <span>
          {t('sidebar.title')} <span className="count-pill">{slides.length}</span>
        </span>
        <button className="icon-btn" aria-label={t('sidebar.hide')} onClick={onHide}>
          <PanelLeftClose size={16} />
        </button>
      </div>
      <nav
        ref={listRef}
        className={`slide-list ${drag.state ? 'is-dragging' : ''}`}
        aria-label={t('sidebar.list')}
      >
        {slides.map((item, i) => (
          <button
            key={i}
            className={`slide-nav ${index === i ? 'selected' : ''} ${changing === i ? 'is-changing' : ''} ${dropClass(drag.state, i)}`}
            onPointerDown={e => drag.start(e, i)}
            onPointerMove={drag.move}
            onPointerUp={drag.end}
            onPointerCancel={drag.cancel}
            onClick={e => {
              if (drag.tookClick()) return
              e.currentTarget.focus({ preventScroll: true })
              onSelect(i)
            }}
            tabIndex={index === i ? 0 : -1}
            onKeyDown={e => {
              const to = listStep(e, i, slides.length)
              if (to !== undefined) {
                e.preventDefault()
                const target = e.currentTarget.parentElement?.children[to] as
                  HTMLElement | undefined
                target?.focus({ preventScroll: true })
                target?.scrollIntoView({ block: 'nearest' })
                return onSelect(to)
              }
              if (!editable || (e.key !== 'Delete' && e.key !== 'Backspace')) return
              e.preventDefault()
              onDelete(i)
            }}
            onContextMenu={e => {
              if (!editable) return
              e.preventDefault()
              if (drag.touching()) return
              const box = e.currentTarget.getBoundingClientRect()
              onMenu({ x: e.clientX || box.left + 24, y: e.clientY || box.top + 24, index: i })
            }}
            aria-current={index === i ? 'step' : undefined}
          >
            <span className="slide-number" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="sr-only">{t('sidebar.slide', { number: i + 1 })}</span>
            <span className="thumb-group">
              <span className="thumbnail" aria-hidden="true" inert>
                <SlideView slide={item} theme={theme} accent={accent} look={look} miniature />
              </span>
              <span className="thumb-name">
                {item.title || t('sidebar.untitledSlide', { number: i + 1 })}
              </span>
            </span>
          </button>
        ))}
      </nav>
      <button className="add-slide" hidden={readOnly} onClick={onAdd}>
        <Plus size={15} />
        {t('sidebar.add')}
      </button>
    </aside>
  )
}

function listStep(event: KeyboardEvent, i: number, count: number) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
  const to = {
    ArrowUp: i - 1,
    ArrowLeft: i - 1,
    ArrowDown: i + 1,
    ArrowRight: i + 1,
    Home: 0,
    End: count - 1,
  }[event.key]
  return to === undefined ? undefined : Math.max(0, Math.min(count - 1, to))
}

type Drag = { from: number; to: number }

type Press = {
  from: number
  pointer: number
  x: number
  y: number
  touch: boolean
  active: boolean
  moved: boolean
  timer?: ReturnType<typeof setTimeout>
}

function useSlideDrag(
  listRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  onMove: (from: number, to: number) => void,
  onMenu: (at: SlideMenuAt) => void,
) {
  const [state, setState] = useState<Drag | null>(null)
  const press = useRef<Press | null>(null)
  const skipClick = useRef(false)
  useEffect(() => {
    const list = listRef.current
    const hold = (event: TouchEvent) => {
      if (press.current?.active) event.preventDefault()
    }
    list?.addEventListener('touchmove', hold, { passive: false })
    return () => list?.removeEventListener('touchmove', hold)
  }, [listRef])
  const stop = () => {
    clearTimeout(press.current?.timer)
    press.current = null
    setState(null)
  }
  const activate = (target: HTMLElement) => {
    const p = press.current
    if (!p) return
    p.active = true
    target.setPointerCapture?.(p.pointer)
    setState({ from: p.from, to: p.from })
  }
  return {
    state,
    start: (event: PointerEvent<HTMLElement>, from: number) => {
      skipClick.current = false
      if (!enabled || event.button !== 0) return
      const target = event.currentTarget
      const touch = event.pointerType === 'touch'
      press.current = {
        from,
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        touch,
        active: false,
        moved: false,
        timer: touch ? setTimeout(() => activate(target), LONG_PRESS_MS) : undefined,
      }
    },
    move: (event: PointerEvent<HTMLElement>) => {
      const p = press.current
      if (!p || p.pointer !== event.pointerId) return
      const far = Math.hypot(event.clientX - p.x, event.clientY - p.y) > DRAG_PX
      if (!p.active) {
        if (!far) return
        if (p.touch) return stop()
        activate(event.currentTarget)
      }
      if (far) p.moved = true
      const list = listRef.current
      if (!list) return
      const box = list.getBoundingClientRect()
      if (event.clientY < box.top + EDGE_PX) list.scrollBy(0, -12)
      if (event.clientY > box.bottom - EDGE_PX) list.scrollBy(0, 12)
      setState({ from: p.from, to: dropIndex(list, p.from, event.clientY) })
    },
    end: (event: PointerEvent<HTMLElement>) => {
      const p = press.current
      if (!p || p.pointer !== event.pointerId) return
      if (p.active) {
        skipClick.current = true
        const to = dropIndex(listRef.current!, p.from, event.clientY)
        if (p.moved && to !== p.from) {
          onMove(p.from, to)
          requestAnimationFrame(() =>
            (listRef.current?.children[to] as HTMLElement | undefined)?.focus({
              preventScroll: true,
            }),
          )
        } else if (p.touch) onMenu({ x: event.clientX, y: event.clientY, index: p.from })
      }
      stop()
    },
    cancel: stop,
    touching: () => !!press.current?.touch,
    tookClick: () => {
      const took = skipClick.current
      skipClick.current = false
      return took
    },
  }
}

function dropIndex(list: HTMLElement, from: number, y: number) {
  const items = [...list.children] as HTMLElement[]
  return items.filter((item, i) => {
    if (i === from) return false
    const box = item.getBoundingClientRect()
    return box.top + box.height / 2 < y
  }).length
}

function dropClass(drag: Drag | null, i: number) {
  if (!drag) return ''
  if (i === drag.from) return 'is-dragged'
  if (i !== drag.to) return ''
  return drag.to < drag.from ? 'drop-before' : 'drop-after'
}
