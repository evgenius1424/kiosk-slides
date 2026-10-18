'use client'

import { useTranslations } from 'next-intl'
import { PanelLeftClose, Plus } from 'lucide-react'
import type { Presentation, PresentationLook } from '@/lib/presentation'
import { SlideView } from '../slide'

export type SlideMenuAt = { x: number; y: number; index: number }

export function SlideSidebar({
  presentation,
  look,
  index,
  changing,
  editable,
  readOnly,
  onSelect,
  onDelete,
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
  onMenu: (at: SlideMenuAt) => void
  onAdd: () => void
  onHide: () => void
}) {
  const t = useTranslations('Workspace')
  const { slides, theme, tone: accent } = presentation
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
      <nav className="slide-list" aria-label={t('sidebar.list')}>
        {slides.map((item, i) => (
          <button
            key={i}
            className={`slide-nav ${index === i ? 'selected' : ''} ${changing === i ? 'is-changing' : ''}`}
            onClick={() => onSelect(i)}
            onKeyDown={e => {
              if (!editable || (e.key !== 'Delete' && e.key !== 'Backspace')) return
              e.preventDefault()
              onDelete(i)
            }}
            onContextMenu={e => {
              if (!editable) return
              e.preventDefault()
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
