'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, ClipboardPaste, Copy, Layers2, Sparkles, X } from 'lucide-react'
import { type ChatGPTStatus, connectChatGPT, fetchStatus } from '@/lib/chat'
import {
  AUDIENCES,
  LENGTHS,
  STARTERS,
  requestPrompt,
  selectGap,
  talkRequest,
  type Length,
  type Talk,
} from '@/lib/talk'
import { useOnline } from './use-online'

const DRAFT_KEY = 'kiosk-talk'
const RESUME_KEY = 'kiosk-talk-resume'

export function resumingStart() {
  const resume = session(RESUME_KEY)
  session(RESUME_KEY, null)
  return resume === '1'
}

export function StartScreen({
  prompt,
  onMake,
  onExample,
  onBlank,
  onClose,
}: {
  prompt: string
  onMake: (request: string) => void
  onExample: () => void
  onBlank: () => void
  onClose?: () => void
}) {
  const t = useTranslations('Start')
  const [talk, setTalk] = useState<Talk>({ topic: '' })
  const [status, setStatus] = useState<ChatGPTStatus | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const online = useOnline()
  const topicRef = useRef<HTMLTextAreaElement>(null)
  const ready = status?.available && status.connected && status.planUsage
  const local = online && status?.available
  const hasTopic = !!talk.topic.trim()

  useEffect(() => {
    const saved = draft()
    if (saved) setTalk(saved)
    topicRef.current?.focus()
  }, [])
  useEffect(() => {
    if (online) fetchStatus().then(setStatus, () => setStatus(null))
  }, [online])
  useEffect(() => {
    if (!onClose) return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [onClose])

  const update = (next: Talk) => {
    setTalk(next)
    session(DRAFT_KEY, JSON.stringify(next))
  }
  const pickStarter = (id: (typeof STARTERS)[number]) => {
    update({ ...talk, topic: t(`starters.${id}.text`) })
    requestAnimationFrame(() => topicRef.current && selectGap(topicRef.current))
  }
  const make = () => {
    if (!hasTopic) return topicRef.current?.focus()
    session(DRAFT_KEY, null)
    onMake(talkRequest(talk))
  }
  const connect = async () => {
    setConnecting(true)
    session(RESUME_KEY, '1')
    try {
      await connectChatGPT()
    } catch {
      session(RESUME_KEY, null)
      setConnecting(false)
    }
  }
  const copy = async () => {
    const text = requestPrompt(prompt, talk)
    setCopied(text)
    try {
      await navigator.clipboard.writeText(text)
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }

  return (
    <section className="start-screen" role="dialog" aria-modal="true" aria-labelledby="start-title">
      <header className="start-header">
        <span className="brand">
          <span className="brand-icon">
            <Layers2 size={19} strokeWidth={2.2} />
          </span>
          <span>
            Kiosk<span className="brand-light">Slides</span>
          </span>
        </span>
        {onClose && (
          <button className="icon-btn" aria-label={t('close')} title={t('close')} onClick={onClose}>
            <X size={18} />
          </button>
        )}
      </header>
      {copied ? (
        <div className="start-body">
          <ClipboardPaste size={22} />
          <h1 id="start-title">{t('paste.title')}</h1>
          <p>{failed ? t('paste.copyFailed') : t('paste.copied')}</p>
          {failed && <pre className="start-prompt">{copied}</pre>}
          <p className="start-steps">{t('paste.steps')}</p>
          <div className="start-actions">
            <button className="btn" onClick={copy}>
              <Copy size={14} />
              {t('paste.again')}
            </button>
            <button className="link-button" onClick={() => setCopied(null)}>
              {t('paste.back')}
            </button>
          </div>
        </div>
      ) : (
        <form
          className="start-body"
          onSubmit={e => {
            e.preventDefault()
            if (ready) make()
            else if (local) connect()
            else copy()
          }}
        >
          <h1 id="start-title">{t('title')}</h1>
          <p>{t('body')}</p>
          <div className="start-chips" role="group" aria-label={t('startersLabel')}>
            {STARTERS.map(id => (
              <button key={id} type="button" onClick={() => pickStarter(id)}>
                {t(`starters.${id}.label`)}
              </button>
            ))}
          </div>
          <textarea
            ref={topicRef}
            className="start-topic"
            aria-label={t('topic')}
            placeholder={t('placeholder')}
            value={talk.topic}
            rows={4}
            onChange={e => update({ ...talk, topic: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey))
                e.currentTarget.form?.requestSubmit()
            }}
          />
          <ChipRow
            label={t('audience')}
            options={AUDIENCES}
            value={talk.audience}
            text={id => t(`audiences.${id}`)}
            onChange={audience => update({ ...talk, audience })}
          />
          <ChipRow
            label={t('length')}
            options={Object.keys(LENGTHS) as Length[]}
            value={talk.length}
            text={id => t(`lengths.${id}`, { count: LENGTHS[id] })}
            onChange={length => update({ ...talk, length })}
          />
          <div className="start-actions">
            {ready ? (
              <button className="btn primary" type="submit" disabled={!hasTopic}>
                <Sparkles size={14} />
                {t('make')}
              </button>
            ) : local ? (
              <>
                <button className="btn primary" type="submit" disabled={connecting}>
                  {connecting ? t('connecting') : t('connect')}
                </button>
                <button className="btn" type="button" onClick={copy}>
                  <Copy size={14} />
                  {t('copyPrompt')}
                </button>
              </>
            ) : (
              <button className="btn primary" type="submit" title={t('copyHint')}>
                <Copy size={14} />
                {t('copyPrompt')}
              </button>
            )}
          </div>
        </form>
      )}
      <footer className="start-footer">
        <button className="link-button" onClick={onExample}>
          {t('example')}
          <ArrowRight size={13} />
        </button>
        <button className="link-button" onClick={onBlank}>
          {t('blank')}
          <ArrowRight size={13} />
        </button>
      </footer>
    </section>
  )
}

function ChipRow<T extends string>({
  label,
  options,
  value,
  text,
  onChange,
}: {
  label: string
  options: readonly T[]
  value?: T
  text: (id: T) => string
  onChange: (value?: T) => void
}) {
  return (
    <div className="start-row" role="group" aria-label={label}>
      <span>{label}</span>
      <div className="start-chips">
        {options.map(id => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(value === id ? undefined : id)}
          >
            {text(id)}
          </button>
        ))}
      </div>
    </div>
  )
}

function draft(): Talk | null {
  try {
    const value = JSON.parse(session(DRAFT_KEY) || 'null')
    return typeof value?.topic === 'string' ? value : null
  } catch {
    return null
  }
}

function session(key: string, value?: string | null) {
  try {
    if (value === undefined) return sessionStorage.getItem(key)
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch {}
  return null
}
