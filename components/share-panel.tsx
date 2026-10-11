'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowDownToLine, Copy, X } from 'lucide-react'
import { encode } from 'uqr'
import { QR_LIMIT, shareLink, type ShareLink } from '@/lib/share'

const QR_WIDTH = 340

export function SharePanel({
  open,
  source,
  site,
  onClose,
  onCopied,
  onDownload,
}: {
  open: boolean
  source: string
  site: string
  onClose: () => void
  onCopied: () => void
  onDownload: () => void
}) {
  const t = useTranslations('Share')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [link, setLink] = useState<{ source: string; result: ShareLink } | null>(null)
  const ready = link?.source === source ? link.result : null
  useEffect(() => {
    if (open) dialogRef.current?.showModal()
    else dialogRef.current?.close()
  }, [open])
  useEffect(() => {
    if (!open) return
    let active = true
    shareLink(source, site)
      .then(result => active && setLink({ source, result }))
      .catch(() => active && setLink({ source, result: { tooBig: true } }))
    return () => {
      active = false
    }
  }, [open, source, site])
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      onCopied()
    } catch {
      inputRef.current?.select()
    }
  }
  return (
    <dialog
      ref={dialogRef}
      className="workspace-dialog share-dialog"
      onCancel={onClose}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="dialog-heading">
        <h2>{t('title')}</h2>
        <button className="icon-btn" aria-label={t('close')} onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      {!ready ? (
        <p role="status">{t('making')}</p>
      ) : 'url' in ready ? (
        <>
          <div className="share-link">
            <input
              ref={inputRef}
              readOnly
              aria-label={t('link')}
              value={ready.url}
              onFocus={e => e.target.select()}
            />
            <button className="btn primary" onClick={() => copy(ready.url)}>
              <Copy size={14} />
              {t('copy')}
            </button>
          </div>
          {ready.url.length <= QR_LIMIT ? (
            <QrCode text={ready.url} label={t('code')} />
          ) : (
            <p className="share-note">{t('tooLongForCode')}</p>
          )}
          <p className="share-note">{t('private')}</p>
        </>
      ) : (
        <>
          <p>{t('tooBig')}</p>
          <button className="btn primary" onClick={onDownload}>
            <ArrowDownToLine size={15} />
            {t('download')}
          </button>
        </>
      )}
    </dialog>
  )
}

function QrCode({ text, label }: { text: string; label: string }) {
  const { path, size } = useMemo(() => qrPath(text), [text])
  return (
    <svg
      className="share-code"
      viewBox={`0 0 ${size} ${size}`}
      width={size * Math.max(1, Math.floor(QR_WIDTH / size))}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  )
}

function qrPath(text: string) {
  const { data, size } = encode(text, { ecc: 'L', border: 2 })
  let path = ''
  data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) path += `M${x} ${y}h1v1h-1z`
    }),
  )
  return { path, size }
}
