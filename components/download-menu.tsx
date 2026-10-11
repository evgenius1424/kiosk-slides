'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowDownToLine, ChevronDown, FileText, Globe } from 'lucide-react'

export type DownloadFormat = 'html' | 'pdf'

type Props = {
  busy: boolean
  disabled?: boolean
  onDownload: (format: DownloadFormat) => void
}

const FORMATS = [
  { format: 'html', Icon: Globe },
  { format: 'pdf', Icon: FileText },
] as const

export function DownloadMenu({ busy, disabled, onDownload }: Props) {
  const t = useTranslations('Workspace')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  return (
    <div className="download-menu" ref={rootRef}>
      <button
        className="btn export-btn"
        title={t('downloadHint')}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        disabled={busy || disabled}
      >
        <ArrowDownToLine size={15} />
        {busy ? t('preparing') : t('download')}
        <ChevronDown size={13} className="download-chevron" />
      </button>
      {open && (
        <div className="download-popover" role="menu" aria-label={t('download')}>
          {FORMATS.map(({ format, Icon }) => (
            <button
              key={format}
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onDownload(format)
              }}
            >
              <Icon size={16} />
              <span>
                <strong>{t(`downloadAs.${format}`)}</strong>
                <small>{t(`downloadAs.${format}Hint`)}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
