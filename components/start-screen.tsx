'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Copy,
  Layers2,
  Sparkles,
  X,
} from 'lucide-react'
import { MAX_BRIEF_LENGTH, requestDraft } from '@/lib/ai-draft'
import { type ChatGPTStatus, connectChatGPT, fetchStatus } from '@/lib/chat'
import { parsePresentation, presentationLook } from '@/lib/presentation'
import { slideTitle } from '@/lib/player'
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
import { SlideView } from './slide'
import { useOnline } from './use-online'

const DRAFT_KEY = 'kiosk-talk'
const RESUME_KEY = 'kiosk-talk-resume'
const SHOWCASE_MS = 5000
const FEATURES = ['room', 'share', 'saved'] as const
const MAX_TOPIC_LENGTH =
  MAX_BRIEF_LENGTH - talkRequest({ topic: '', audience: 'screen', length: 'long' }).length

export function resumingStart() {
  const resume = session(RESUME_KEY)
  session(RESUME_KEY, null)
  return resume === '1'
}

export function StartScreen({
  prompt,
  example,
  freeDraft = false,
  onMake,
  onDraft,
  onExample,
  onBlank,
  onClose,
}: {
  prompt: string
  example: string
  freeDraft?: boolean
  onMake: (request: string) => void
  onDraft: (source: string) => void
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
  const [drafting, setDrafting] = useState(false)
  const [draftNote, setDraftNote] = useState<'used' | 'paused' | null>(null)
  const draftRef = useRef<AbortController | null>(null)
  const online = useOnline()
  const topicRef = useRef<HTMLTextAreaElement>(null)
  const ready = status?.available && status.connected && status.planUsage
  const local = online && status?.available
  const hasTopic = !!talk.topic.trim()
  const offerDraft = freeDraft && online && !status?.available && !draftNote

  useEffect(() => {
    const saved = draft()
    if (saved) setTalk(saved)
    topicRef.current?.focus()
  }, [])
  useEffect(() => () => draftRef.current?.abort(), [])
  useEffect(() => {
    if (online) fetchStatus().then(setStatus, () => setStatus(null))
  }, [online])
  useEffect(() => {
    if (!onClose || drafting) return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [onClose, drafting])
  useEffect(() => {
    if (!drafting) return
    const hold = (event: ClipboardEvent) => event.stopImmediatePropagation()
    window.addEventListener('paste', hold, true)
    return () => window.removeEventListener('paste', hold, true)
  }, [drafting])

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
  const makeDraft = async () => {
    if (!hasTopic) return topicRef.current?.focus()
    setDrafting(true)
    draftRef.current = new AbortController()
    const outcome = await requestDraft(talkRequest(talk), draftRef.current.signal).catch(() => null)
    if (!outcome) return
    setDrafting(false)
    if (outcome.kind === 'presentation') {
      session(DRAFT_KEY, null)
      onDraft(outcome.source)
    } else if (outcome.kind === 'limit' && outcome.reason !== 'already-used') setDraftNote('paused')
    else setDraftNote('used')
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
          <button
            className="icon-btn"
            aria-label={t('close')}
            title={t('close')}
            disabled={drafting}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        )}
      </header>
      <div className="start-layout">
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
              else if (offerDraft) makeDraft()
              else copy()
            }}
          >
            <p className="start-tagline">{t('tagline')}</p>
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
              maxLength={offerDraft ? MAX_TOPIC_LENGTH : undefined}
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
              ) : offerDraft ? (
                <>
                  <button className="btn primary" type="submit" disabled={drafting}>
                    <Sparkles size={14} />
                    {drafting ? t('draft.working') : t('draft.make')}
                  </button>
                  <button className="btn" type="button" onClick={copy} disabled={drafting}>
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
            {offerDraft && <p className="start-note">{t('draft.privacy')}</p>}
            {draftNote && (
              <p className="start-note" role="status">
                {t(`draft.${draftNote}`)}
              </p>
            )}
          </form>
        )}
        <Showcase example={example} busy={drafting} onOpen={onExample} />
      </div>
      <footer className="start-footer">
        <button className="link-button" disabled={drafting} onClick={onBlank}>
          {t('blank')}
          <ArrowRight size={13} />
        </button>
      </footer>
    </section>
  )
}

function Showcase({
  example,
  busy,
  onOpen,
}: {
  example: string
  busy: boolean
  onOpen: () => void
}) {
  const t = useTranslations('Start.showcase')
  const presentation = useMemo(() => parsePresentation(example), [example])
  const look = presentationLook(presentation)
  const { slides } = presentation
  const [index, setIndex] = useState(0)
  const [auto, setAuto] = useState(true)
  const slide = slides[index]
  const move = (delta: number) => {
    setAuto(false)
    setIndex(i => (i + delta + slides.length) % slides.length)
  }
  useEffect(() => {
    if (!auto || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const timer = setTimeout(() => setIndex(i => (i + 1) % slides.length), SHOWCASE_MS)
    return () => clearTimeout(timer)
  }, [auto, index, slides.length])
  return (
    <section
      className="start-showcase"
      aria-roledescription="carousel"
      aria-label={t('label')}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          move(e.key === 'ArrowLeft' ? -1 : 1)
        }
      }}
    >
      <div
        className={`start-slide slide-backdrop ${presentation.theme}`}
        style={{ '--slide-tone': presentation.tone } as React.CSSProperties}
        onPointerEnter={() => setAuto(false)}
      >
        <div key={index} className="start-slide-frame" aria-label={slideTitle(slide)} inert>
          <SlideView
            slide={slide}
            theme={presentation.theme}
            accent={presentation.tone}
            look={look}
          />
        </div>
      </div>
      <div className="start-showcase-bar">
        <button className="icon-btn" aria-label={t('previous')} onClick={() => move(-1)}>
          <ChevronLeft size={18} />
        </button>
        <span aria-live={auto ? 'off' : 'polite'}>
          {t('count', { number: index + 1, count: slides.length, title: slideTitle(slide) })}
        </span>
        <button className="icon-btn" aria-label={t('next')} onClick={() => move(1)}>
          <ChevronRight size={18} />
        </button>
        <button className="btn" disabled={busy} onClick={onOpen}>
          {t('open')}
          <ArrowRight size={14} />
        </button>
      </div>
      <ul className="start-features">
        {FEATURES.map(id => (
          <li key={id}>
            <Check size={14} />
            {t(`features.${id}`)}
          </li>
        ))}
      </ul>
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
