'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { useTranslations } from 'next-intl'
import {
  Copy,
  Heading1,
  Minimize2,
  PieChart,
  Plus,
  Shuffle,
  SplitSquareHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import {
  MODEL_KEY,
  RequestError,
  changeSlide,
  fetchModels,
  fetchStatus,
  type ChatGPTModel,
} from '@/lib/chat'
import {
  formatPresentation,
  parsePresentation,
  replaceSlide,
  slideLines,
  slideSource,
} from '@/lib/presentation'
import {
  SLIDE_ACTIONS,
  extractSlides,
  slideCopyRequest,
  type SlideAction,
} from '@/lib/slide-actions'

export type SlideChange = { source: string; index: number; count: number }
type Job = { action: SlideAction; index: number; original: string }

const ICONS = {
  shorter: Minimize2,
  visual: PieChart,
  split: SplitSquareHorizontal,
  headline: Heading1,
  widget: Shuffle,
} satisfies Record<SlideAction, unknown>

export function useSlideActions({
  prompt,
  sourceRef,
  onChange,
  onNotice,
}: {
  prompt: string
  sourceRef: RefObject<string>
  onChange: (change: SlideChange) => void
  onNotice: (message: string) => void
}) {
  const t = useTranslations('SlideActions')
  const [working, setWorking] = useState<Job | null>(null)
  const [pasting, setPasting] = useState<(Job & { prompt: string }) | null>(null)
  const modelsRef = useRef<ChatGPTModel[] | null>(null)
  const apply = (job: Job, markdown: string) => {
    const source = sourceRef.current
    const at = findSlide(source, job.index, job.original)
    if (at < 0) return t('moved')
    const next = replaceSlide(source, at, tidySlides(markdown))
    try {
      const count = parsePresentation(next).slides.length - slideLines(source).length + 1
      onChange({ source: next, index: at, count })
      return ''
    } catch (err) {
      return (err as Error).message
    }
  }
  const run = async (action: SlideAction, index: number) => {
    if (working) return
    const source = sourceRef.current
    const job = { action, index, original: slideSource(source, index) }
    const model = await aiModel(modelsRef)
    if (!model) {
      const text = slideCopyRequest(prompt, action, source, index)
      setPasting({ ...job, prompt: text })
      try {
        await navigator.clipboard.writeText(text)
        onNotice(t('copied'))
      } catch {
        onNotice(t('copyFailed'))
      }
      return
    }
    setWorking(job)
    try {
      const error = apply(job, await changeSlide({ action, source, index, model }))
      if (error) onNotice(error)
    } catch (err) {
      onNotice(
        err instanceof RequestError
          ? err.message || t('failed')
          : err instanceof TypeError
            ? t('offline')
            : (err as Error).message || t('failed'),
      )
    } finally {
      setWorking(null)
    }
  }
  const paste = (text: string) => {
    if (!pasting) return ''
    const markdown = extractSlides(text)
    if (!markdown) return t('paste.empty')
    const error = apply(pasting, markdown)
    if (!error) setPasting(null)
    return error
  }
  return { working, pasting, run, paste, cancel: () => setPasting(null) }
}

export function SlideActionBar({
  disabled,
  working,
  onAction,
}: {
  disabled: boolean
  working: boolean
  onAction: (action: SlideAction) => void
}) {
  const t = useTranslations('SlideActions')
  return (
    <div className="slide-actions" role="toolbar" aria-label={t('label')}>
      {SLIDE_ACTIONS.map(action => {
        const Icon = ICONS[action]
        return (
          <button
            key={action}
            className="btn"
            title={t(`actions.${action}.hint`)}
            disabled={disabled || working}
            onClick={() => onAction(action)}
          >
            <Icon size={14} />
            {t(`actions.${action}.name`)}
          </button>
        )
      })}
    </div>
  )
}

export function SlideActionMenu({
  at,
  onAction,
  onAdd,
  onDelete,
  onClose,
}: {
  at: { x: number; y: number; index: number }
  onAction: (action: SlideAction, index: number) => void
  onAdd: (index: number) => void
  onDelete?: (index: number) => void
  onClose: () => void
}) {
  const t = useTranslations('SlideActions')
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    menuRef.current?.querySelector<HTMLElement>('button')?.focus()
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose()
    }
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      event.preventDefault()
      const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('button') ?? [])]
      const now = items.indexOf(document.activeElement as HTMLElement)
      items[(now + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', keys, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', keys, true)
    }
  }, [onClose])
  return (
    <div
      ref={menuRef}
      className="slide-menu"
      role="menu"
      aria-label={t('menu', { number: at.index + 1 })}
      style={{ left: at.x, top: at.y }}
    >
      {SLIDE_ACTIONS.map(action => {
        const Icon = ICONS[action]
        return (
          <button
            key={action}
            role="menuitem"
            title={t(`actions.${action}.hint`)}
            onClick={() => {
              onClose()
              onAction(action, at.index)
            }}
          >
            <Icon size={14} />
            {t(`actions.${action}.name`)}
          </button>
        )
      })}
      <hr />
      <button
        role="menuitem"
        onClick={() => {
          onClose()
          onAdd(at.index)
        }}
      >
        <Plus size={14} />
        {t('add')}
      </button>
      {onDelete && (
        <button
          role="menuitem"
          onClick={() => {
            onClose()
            onDelete(at.index)
          }}
        >
          <Trash2 size={14} />
          {t('delete')}
        </button>
      )}
    </div>
  )
}

export function SlidePasteDialog({
  prompt,
  onPaste,
  onCopied,
  onClose,
}: {
  prompt: string | null
  onPaste: (text: string) => string
  onCopied: () => void
  onClose: () => void
}) {
  const t = useTranslations('SlideActions.paste')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (prompt === null) return dialogRef.current?.close()
    setText('')
    setError('')
    dialogRef.current?.showModal()
  }, [prompt])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt ?? '')
      onCopied()
    } catch {}
  }
  return (
    <dialog
      ref={dialogRef}
      className="workspace-dialog slide-paste"
      aria-labelledby="slide-paste-title"
      onCancel={onClose}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="dialog-heading">
        <h2 id="slide-paste-title">{t('title')}</h2>
        <button className="icon-btn" aria-label={t('close')} onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <p>{t('body')}</p>
      <form
        onSubmit={e => {
          e.preventDefault()
          setError(onPaste(text))
        }}
      >
        <textarea
          aria-label={t('label')}
          aria-invalid={!!error}
          value={text}
          rows={8}
          spellCheck={false}
          autoFocus
          onChange={e => {
            setText(e.target.value)
            setError('')
          }}
        />
        {error && (
          <p className="slide-paste-error" role="alert">
            {error}
          </p>
        )}
        <div className="slide-paste-actions">
          <button type="button" className="btn" onClick={copy}>
            <Copy size={14} />
            {t('copyAgain')}
          </button>
          <button type="submit" className="btn primary" disabled={!text.trim()}>
            {t('replace')}
          </button>
        </div>
      </form>
      <details className="format-details">
        <summary>{t('showPrompt')}</summary>
        <pre>{prompt}</pre>
      </details>
    </dialog>
  )
}

async function aiModel(cache: RefObject<ChatGPTModel[] | null>) {
  try {
    const status = await fetchStatus()
    if (!status.available || !status.connected || !status.planUsage) return ''
    cache.current ??= await fetchModels()
    const saved = localStorage.getItem(MODEL_KEY)
    return (cache.current.find(m => m.slug === saved) ?? cache.current[0])?.slug ?? ''
  } catch {
    return ''
  }
}

function findSlide(source: string, index: number, original: string) {
  if (slideSource(source, index) === original) return index
  return slideLines(source).findIndex((_, i) => slideSource(source, i) === original)
}

function tidySlides(markdown: string) {
  return formatPresentation(`${markdown}\n`).trim()
}
