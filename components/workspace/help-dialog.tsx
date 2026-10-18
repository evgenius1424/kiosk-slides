'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Blocks, Copy, X } from 'lucide-react'
import { requestPrompt } from '@/lib/talk'

export type HelpTopic = 'help' | 'format'

const BASICS = ['newSlide', 'heading', 'highlight', 'text', 'extras'] as const
const SHORTCUTS = [
  'next',
  'previous',
  'autoplay',
  'present',
  'shareSafe',
  'leave',
  'ends',
  'tidy',
  'undo',
] as const

export function HelpDialog({
  topic,
  prompt,
  onClose,
  onCopyPrompt,
  onAddSkill,
}: {
  topic: HelpTopic | null
  prompt: string
  onClose: () => void
  onCopyPrompt: () => void
  onAddSkill?: () => void
}) {
  const th = useTranslations('Help')
  const tk = useTranslations('Shortcuts')
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (topic) dialogRef.current?.showModal()
    else dialogRef.current?.close()
  }, [topic])
  return (
    <dialog
      ref={dialogRef}
      className={`workspace-dialog ${topic === 'format' ? 'wide' : ''}`}
      onCancel={onClose}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="dialog-heading">
        <h2>{topic === 'format' ? th('title') : tk('title')}</h2>
        <button className="icon-btn" aria-label={tk('close')} onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      {topic === 'format' ? (
        <>
          <p>{th('intro')}</p>
          <div className="prompt-card">
            <div>
              <strong>{th('promptTitle')}</strong>
              <p>{th('promptBody')}</p>
            </div>
            <button className="btn primary" onClick={onCopyPrompt}>
              <Copy size={14} />
              {th('copyPrompt')}
            </button>
          </div>
          {onAddSkill && (
            <div className="prompt-card">
              <div>
                <strong>{th('skillTitle')}</strong>
                <p>{th('skillBody')}</p>
              </div>
              <button className="btn" onClick={onAddSkill}>
                <Blocks size={14} />
                {th('addSkill')}
              </button>
            </div>
          )}
          <h3 className="format-heading">{th('basicsTitle')}</h3>
          <dl className="format-rules">
            {BASICS.map(id => (
              <div key={id}>
                <dt>
                  <code>{th(`basics.${id}.term`)}</code>
                </dt>
                <dd>{th(`basics.${id}.rule`)}</dd>
              </div>
            ))}
          </dl>
          <details className="format-details">
            <summary>{th('showPrompt')}</summary>
            <pre>{requestPrompt(prompt)}</pre>
          </details>
        </>
      ) : (
        <>
          <p>{tk('intro')}</p>
          <dl className="shortcut-list">
            {SHORTCUTS.map(id => (
              <div key={id}>
                <dt>{tk(`items.${id}.name`)}</dt>
                <dd>
                  <kbd>{tk(`items.${id}.keys`)}</kbd>
                </dd>
              </div>
            ))}
          </dl>
          <div className="dialog-note">{tk('note')}</div>
        </>
      )}
    </dialog>
  )
}
