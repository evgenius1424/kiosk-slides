'use client'

import { useEffect, useEffectEvent, useReducer, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowUp,
  Blocks,
  Check,
  Copy,
  ExternalLink,
  LogOut,
  MonitorDown,
  RotateCcw,
  Sparkles,
  Square,
  TriangleAlert,
  WifiOff,
} from 'lucide-react'
import { REPO_URL } from '@/lib/author'
import {
  type ChatGPTStatus,
  type ChatMessage,
  MANAGE_USAGE_URL,
  MODEL_KEY,
  RequestError,
  streamChat,
  visibleReply,
} from '@/lib/chat'
import { STARTERS, selectGap } from '@/lib/talk'
import {
  preferredModel,
  useChatGPTStatus,
  useConnect,
  useDisconnect,
  useModels,
} from './use-chatgpt'
import { useOnline } from './use-online'

type Entry = ChatMessage & { presentation?: string; notes?: string[]; error?: string }
type Conversation = { entries: Entry[]; input: string; live: Live | null }
type Live = { text: string; notes: string[] }
type ConversationEvent =
  | { type: 'typed'; input: string }
  | { type: 'sent'; content: string }
  | ({ type: 'progress' } & Live)
  | { type: 'replied'; entry: Entry }
  | { type: 'cleared' }

const WELCOME_KEY = 'kiosk-chatgpt-welcomed'
const LOCAL_URL = 'http://127.0.0.1:3000'
const EMPTY_CONVERSATION: Conversation = { entries: [], input: '', live: null }

export function PresentationChat({
  source,
  onPresentation,
  onOpen,
  onCopyPrompt,
  onAddSkill,
  request,
  onRequestTaken,
}: {
  source: string
  onPresentation: (source: string, fresh: boolean) => string
  onOpen: () => void
  onCopyPrompt: () => void
  onAddSkill?: () => void
  request?: string
  onRequestTaken: () => void
}) {
  const t = useTranslations('Chat')
  const tst = useTranslations('Start.starters')
  const [{ entries, input, live }, dispatch] = useReducer(conversationReducer, EMPTY_CONVERSATION)
  const [notice, setNotice] = useState('')
  const [welcome, setWelcome] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const online = useOnline()
  const statusQ = useChatGPTStatus()
  const unreachable = statusQ.error instanceof TypeError
  const status: ChatGPTStatus | null = statusQ.error
    ? { available: false, reason: errorText(statusQ.error, t) }
    : (statusQ.data ?? null)
  const ready = !!(status?.available && status.connected && status.planUsage)
  const modelsQ = useModels(ready)
  const models = modelsQ.data ?? []
  const model = preferredModel(models, picked)
  const modelNotice = modelsQ.error
    ? errorText(modelsQ.error, t)
    : modelsQ.data && !models.length
      ? t('errors.noModels')
      : ''
  const { connect, connecting } = useConnect(err => setNotice(errorText(err, t)))
  const signOut = useDisconnect()
  const abortRef = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const busy = live !== null
  const refresh = () => statusQ.refetch()

  const openFromSignIn = useEffectEvent(onOpen)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('chatgpt_error')) setNotice(params.get('chatgpt_error')!)
    if (params.get('chatgpt') === 'connected' && !storage(WELCOME_KEY)) setWelcome(true)
    if (params.has('chatgpt') || params.has('chatgpt_error')) {
      openFromSignIn()
      params.delete('chatgpt')
      params.delete('chatgpt_error')
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${params.size ? `?${params}` : ''}`,
      )
    }
  }, [])
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [entries, live])
  useEffect(() => () => abortRef.current?.abort(), [])

  const disconnect = () => {
    abortRef.current?.abort()
    setNotice('')
    signOut.mutate(undefined, {
      onSuccess: ({ revoked }) => setNotice(revoked ? '' : t('errors.signOutUnconfirmed')),
      onError: err => setNotice(errorText(err, t)),
    })
    setPicked(null)
  }
  const chooseModel = (slug: string) => {
    setPicked(slug)
    storage(MODEL_KEY, slug)
  }
  const dismissWelcome = () => {
    setWelcome(false)
    storage(WELCOME_KEY, '1')
  }

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || busy || !ready || !model) return
    const history = [...entries, { role: 'user' as const, content }]
    dispatch({ type: 'sent', content })
    const controller = new AbortController()
    abortRef.current = controller
    let attempt = ''
    const notes: string[] = []
    let presentation = ''
    const fresh = !entries.some(e => e.presentation)
    let reply = ''
    let error = ''
    try {
      await streamChat(
        history.filter(e => e.content).map(({ role, content }) => ({ role, content })),
        source,
        model,
        event => {
          if (event.type === 'text') attempt += event.text
          if (event.type === 'retry') {
            notes.push(event.polish ? t('progress.polishing') : t('progress.fixing'))
            attempt = ''
          }
          if (event.type === 'presentation')
            presentation = onPresentation(event.source, fresh && !presentation)
          if (event.type === 'done') reply = event.reply
          if (event.type === 'error') error = event.message
          dispatch({ type: 'progress', text: attempt, notes: [...notes] })
        },
        controller.signal,
      )
    } catch (err) {
      error = controller.signal.aborted ? t('errors.stopped') : errorText(err, t)
    }
    dispatch({
      type: 'replied',
      entry: { role: 'assistant', content: reply || '', presentation, notes, error },
    })
    abortRef.current = null
    if (/sign-in|session|connect again/i.test(error)) refresh()
  }
  useEffect(() => {
    if (!request || !ready || !model || busy) return
    onRequestTaken()
    send(request)
  })

  if (!online || unreachable)
    return (
      <div className="chat-panel">
        <div className="chat-empty">
          <WifiOff size={20} />
          <h2>{t('offline.title')}</h2>
          <p>{t('offline.body')}</p>
          {online && (
            <button className="btn" onClick={() => refresh()}>
              <RotateCcw size={14} />
              {t('offline.retry')}
            </button>
          )}
        </div>
      </div>
    )
  if (!status)
    return (
      <div className="chat-panel">
        <div className="chat-empty">
          <span className="chat-spinner" />
        </div>
      </div>
    )
  if (!status.available)
    return (
      <div className="chat-panel">
        <RunLocally reason={status.reason} onCopyPrompt={onCopyPrompt} onAddSkill={onAddSkill} />
      </div>
    )
  if (!status.connected || !status.planUsage)
    return (
      <div className="chat-panel">
        <div className="chat-messages">
          <div className="chat-empty">
            <Sparkles size={20} />
            <h2>{t('connect.title')}</h2>
            <p>
              {status.connected
                ? t('connect.noPlanUsage', { email: status.email })
                : t('connect.intro')}
            </p>
            <button
              className="btn primary chatgpt-button"
              onClick={() => {
                setNotice('')
                connect()
              }}
              disabled={connecting}
            >
              {connecting ? t('connect.opening') : t('connect.button')}
            </button>
            <p className="chat-fineprint">{t('connect.fineprint')}</p>
            {status.connected && (
              <button className="link-button" onClick={disconnect}>
                {t('connect.signOut', { email: status.email })}
              </button>
            )}
            {notice && (
              <span className="chat-note error">
                <TriangleAlert size={12} />
                {notice}
              </span>
            )}
          </div>
        </div>
      </div>
    )

  return (
    <div className="chat-panel">
      {welcome && (
        <div
          className="chat-welcome"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chatgpt-welcome-title"
        >
          <div>
            <h2 id="chatgpt-welcome-title">{t('welcome.title')}</h2>
            <p>{t('welcome.body')}</p>
            <div className="chat-actions">
              <a className="btn" href={MANAGE_USAGE_URL} target="_blank" rel="noreferrer">
                {t('welcome.manageUsage')}
                <ExternalLink size={13} />
              </a>
              <button className="btn primary" onClick={dismissWelcome} autoFocus>
                {t('welcome.gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="chat-messages" ref={listRef} aria-live="polite">
        {!entries.length && !busy && (
          <div className="chat-empty">
            <Sparkles size={20} />
            <h2>{t('empty.title')}</h2>
            <p>{t('empty.body')}</p>
            <div className="chat-suggestions">
              {STARTERS.map(id => (
                <button
                  key={id}
                  onClick={() => {
                    dispatch({ type: 'typed', input: tst(`${id}.text`) })
                    requestAnimationFrame(
                      () => composerRef.current && selectGap(composerRef.current),
                    )
                  }}
                >
                  {tst(`${id}.label`)}
                </button>
              ))}
            </div>
          </div>
        )}
        {entries.map((entry, i) =>
          entry.role === 'user' ? (
            <div key={i} className="chat-bubble user">
              {entry.content}
            </div>
          ) : (
            <AssistantBubble
              key={i}
              text={entry.content}
              notes={entry.notes || []}
              presentation={entry.presentation}
              error={entry.error}
            />
          ),
        )}
        {live && <AssistantBubble text={live.text} notes={live.notes} pending />}
        {(notice || modelNotice) && (
          <span className="chat-note error">
            <TriangleAlert size={12} />
            {notice || modelNotice}
          </span>
        )}
      </div>
      <form
        className="chat-composer"
        onSubmit={e => {
          e.preventDefault()
          send(input)
        }}
      >
        <textarea
          ref={composerRef}
          aria-label={t('composer.label')}
          placeholder={entries.length ? t('composer.followUp') : t('composer.first')}
          value={input}
          rows={2}
          onChange={e => dispatch({ type: 'typed', input: e.target.value })}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send(input)
            }
          }}
        />
        <div className="chat-actions">
          <div className="chat-plan">
            <select
              aria-label={t('composer.model')}
              value={model}
              onChange={e => chooseModel(e.target.value)}
              disabled={busy || !models.length}
            >
              {models.map(m => (
                <option key={m.slug} value={m.slug}>
                  {m.name}
                </option>
              ))}
            </select>
            <span>
              {t.rich('composer.usingPlan', {
                link: text => (
                  <a href={MANAGE_USAGE_URL} target="_blank" rel="noreferrer">
                    {text}
                  </a>
                ),
              })}
            </span>
            <button
              type="button"
              className="icon-btn"
              aria-label={t('composer.signOut', { email: status.email })}
              title={t('connect.signOut', { email: status.email })}
              onClick={disconnect}
            >
              <LogOut size={14} />
            </button>
          </div>
          {entries.length > 0 && !busy && (
            <button type="button" className="btn" onClick={() => dispatch({ type: 'cleared' })}>
              <RotateCcw size={14} />
              {t('composer.newChat')}
            </button>
          )}
          {busy ? (
            <button type="button" className="btn" onClick={() => abortRef.current?.abort()}>
              <Square size={12} fill="currentColor" />
              {t('composer.stop')}
            </button>
          ) : (
            <button type="submit" className="btn primary" disabled={!input.trim() || !model}>
              <ArrowUp size={15} />
              {t('composer.send')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function RunLocally({
  reason,
  onCopyPrompt,
  onAddSkill,
}: {
  reason: string
  onCopyPrompt: () => void
  onAddSkill?: () => void
}) {
  const t = useTranslations('Chat.local')
  return (
    <div className="chat-messages">
      <div className="chat-empty">
        <Sparkles size={20} />
        <h2>{t('title')}</h2>
        <p>{t('body')}</p>
        <button className="btn primary" onClick={onCopyPrompt}>
          <Copy size={14} />
          {t('copyPrompt')}
        </button>
        {onAddSkill && (
          <button className="btn chat-skill" onClick={onAddSkill}>
            <Blocks size={14} />
            {t('addSkill')}
          </button>
        )}
        <details className="chat-local">
          <summary>
            <MonitorDown size={14} />
            {t('runHere')}
          </summary>
          <p>
            {reason} {t('privacy')}
          </p>
          <pre className="chat-steps">{`git clone ${REPO_URL}\ncd kiosk-slides\npnpm install\npnpm dev`}</pre>
          <p>{t.rich('then', { url: LOCAL_URL, strong: text => <strong>{text}</strong> })}</p>
        </details>
      </div>
    </div>
  )
}

function AssistantBubble({
  text,
  notes,
  presentation,
  error,
  pending,
}: {
  text: string
  notes: string[]
  presentation?: string
  error?: string
  pending?: boolean
}) {
  const t = useTranslations('Chat.progress')
  const reply = visibleReply(text)
  return (
    <div className="chat-bubble assistant">
      {notes.map((note, i) => (
        <span key={i} className="chat-note">
          <RotateCcw size={12} />
          {note}
        </span>
      ))}
      {reply.text && <p>{reply.text}</p>}
      {pending && (
        <span className="chat-note">
          <span className="chat-spinner" />
          {reply.writing ? t('writing') : t('thinking')}
        </span>
      )}
      {presentation && (
        <span className="chat-note success">
          <Check size={12} />
          {t('saved', { name: presentation })}
        </span>
      )}
      {error && (
        <span className="chat-note error">
          <TriangleAlert size={12} />
          {error}
        </span>
      )}
    </div>
  )
}

function conversationReducer(state: Conversation, event: ConversationEvent): Conversation {
  switch (event.type) {
    case 'typed':
      return { ...state, input: event.input }
    case 'sent':
      return {
        entries: [...state.entries, { role: 'user', content: event.content }],
        input: '',
        live: { text: '', notes: [] },
      }
    case 'progress':
      return { ...state, live: { text: event.text, notes: event.notes } }
    case 'replied':
      return { ...state, entries: [...state.entries, event.entry], live: null }
    case 'cleared':
      return { ...state, entries: [] }
  }
}

function errorText(err: unknown, t: ReturnType<typeof useTranslations<'Chat'>>) {
  if (err instanceof TypeError) return t('errors.offline')
  if (err instanceof RequestError)
    return err.message || t('errors.requestFailed', { status: err.status })
  return (err as Error).message
}

function storage(key: string, value?: string) {
  try {
    if (value === undefined) return localStorage.getItem(key)
    localStorage.setItem(key, value)
  } catch {}
  return null
}
