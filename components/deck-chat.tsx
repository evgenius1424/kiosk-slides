'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowUp, Check, Copy, ExternalLink, LogOut, MonitorDown, RotateCcw, Sparkles, Square, TriangleAlert } from 'lucide-react'
import { type ChatGPTModel, type ChatGPTStatus, type ChatMessage, MANAGE_USAGE_URL, RequestError, connectChatGPT, disconnectChatGPT, fetchModels, fetchStatus, streamChat, visibleReply } from '@/lib/chat'

type Entry = ChatMessage & { deck?: string; notes?: string[]; error?: string }

const SUGGESTIONS = ['pitch', 'onboarding', 'tighten'] as const
const MODEL_KEY = 'kiosk-chatgpt-model'
const WELCOME_KEY = 'kiosk-chatgpt-welcomed'
const REPO_URL = 'https://github.com/evgenius1424/kiosk-slides'
const LOCAL_URL = 'http://127.0.0.1:3000'

export function DeckChat({ source, onDeck, onOpen, onCopyPrompt }: { source: string; onDeck: (source: string, fresh: boolean) => string; onOpen: () => void; onCopyPrompt: () => void }) {
  const t = useTranslations('Chat')
  const [status, setStatus] = useState<ChatGPTStatus | null>(null)
  const [models, setModels] = useState<ChatGPTModel[]>([])
  const [model, setModel] = useState('')
  const [notice, setNotice] = useState('')
  const [welcome, setWelcome] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [input, setInput] = useState('')
  const [live, setLive] = useState<{ text: string; notes: string[] } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const busy = live !== null
  const ready = status?.available && status.connected && status.planUsage

  const refresh = useCallback(async () => {
    try { setStatus(await fetchStatus()) } catch (err) { setStatus({ available: false, reason: errorText(err, t) }) }
  }, [t])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('chatgpt_error')) setNotice(params.get('chatgpt_error')!)
    if (params.get('chatgpt') === 'connected' && !storage(WELCOME_KEY)) setWelcome(true)
    if (params.has('chatgpt') || params.has('chatgpt_error')) { onOpen(); params.delete('chatgpt'); params.delete('chatgpt_error'); window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`) }
    refresh()
  }, [refresh])
  useEffect(() => {
    if (!ready) return
    fetchModels().then(list => {
      setModels(list)
      const saved = storage(MODEL_KEY)
      setModel(list.some(m => m.slug === saved) ? saved! : list[0]?.slug || '')
      if (!list.length) setNotice(t('errors.noModels'))
    }).catch(err => setNotice(errorText(err, t)))
  }, [ready, t])
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [entries, live])
  useEffect(() => () => abortRef.current?.abort(), [])

  const connect = async () => {
    setConnecting(true); setNotice('')
    try { await connectChatGPT() } catch (err) { setNotice(errorText(err, t)); setConnecting(false) }
  }
  const disconnect = async () => {
    abortRef.current?.abort()
    try {
      const { revoked } = await disconnectChatGPT()
      setNotice(revoked ? '' : t('errors.signOutUnconfirmed'))
    } catch (err) { setNotice(errorText(err, t)) }
    setModels([]); setModel(''); refresh()
  }
  const chooseModel = (slug: string) => { setModel(slug); storage(MODEL_KEY, slug) }
  const dismissWelcome = () => { setWelcome(false); storage(WELCOME_KEY, '1') }

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || busy || !ready || !model) return
    const history = [...entries, { role: 'user' as const, content }]
    setEntries(history); setInput('')
    const controller = new AbortController(); abortRef.current = controller
    let attempt = ''; const notes: string[] = []; let deck = ''; const fresh = !entries.some(e => e.deck); let reply = ''; let error = ''
    setLive({ text: '', notes: [] })
    try {
      await streamChat(history.filter(e => e.content).map(({ role, content }) => ({ role, content })), source, model, event => {
        if (event.type === 'text') attempt += event.text
        if (event.type === 'retry') { notes.push(t('progress.fixing')); attempt = '' }
        if (event.type === 'deck') deck = onDeck(event.source, fresh && !deck)
        if (event.type === 'done') reply = event.reply
        if (event.type === 'error') error = event.message
        setLive({ text: attempt, notes: [...notes] })
      }, controller.signal)
    } catch (err) {
      error = controller.signal.aborted ? t('errors.stopped') : errorText(err, t)
    }
    setEntries(current => [...current, { role: 'assistant', content: reply || '', deck, notes, error }])
    setLive(null); abortRef.current = null
    if (/sign-in|session|connect again/i.test(error)) refresh()
  }

  if (!status) return <div className="chat-panel"><div className="chat-empty"><span className="chat-spinner" /></div></div>
  if (!status.available) return <div className="chat-panel"><RunLocally reason={status.reason} onCopyPrompt={onCopyPrompt} /></div>
  if (!status.connected || !status.planUsage) return <div className="chat-panel"><div className="chat-messages"><div className="chat-empty">
    <Sparkles size={20} />
    <h2>{t('connect.title')}</h2>
    <p>{status.connected ? t('connect.noPlanUsage', { email: status.email }) : t('connect.intro')}</p>
    <button className="btn primary chatgpt-button" onClick={connect} disabled={connecting}>{connecting ? t('connect.opening') : t('connect.button')}</button>
    <p className="chat-fineprint">{t('connect.fineprint')}</p>
    {status.connected && <button className="link-button" onClick={disconnect}>{t('connect.signOut', { email: status.email })}</button>}
    {notice && <span className="chat-note error"><TriangleAlert size={12} />{notice}</span>}
  </div></div></div>

  return <div className="chat-panel">
    {welcome && <div className="chat-welcome" role="dialog" aria-modal="true" aria-labelledby="chatgpt-welcome-title"><div>
      <h2 id="chatgpt-welcome-title">{t('welcome.title')}</h2>
      <p>{t('welcome.body')}</p>
      <div className="chat-actions"><a className="btn" href={MANAGE_USAGE_URL} target="_blank" rel="noreferrer">{t('welcome.manageUsage')}<ExternalLink size={13} /></a><button className="btn primary" onClick={dismissWelcome} autoFocus>{t('welcome.gotIt')}</button></div>
    </div></div>}
    <div className="chat-messages" ref={listRef} aria-live="polite">
      {!entries.length && !busy && <div className="chat-empty"><Sparkles size={20} /><h2>{t('empty.title')}</h2><p>{t('empty.body')}</p><div className="chat-suggestions">{SUGGESTIONS.map(id => <button key={id} onClick={() => send(t(`suggestions.${id}`))} disabled={!model}>{t(`suggestions.${id}`)}</button>)}</div></div>}
      {entries.map((entry, i) => entry.role === 'user' ? <div key={i} className="chat-bubble user">{entry.content}</div> : <AssistantBubble key={i} text={entry.content} notes={entry.notes || []} deck={entry.deck} error={entry.error} />)}
      {live && <AssistantBubble text={live.text} notes={live.notes} pending />}
      {notice && <span className="chat-note error"><TriangleAlert size={12} />{notice}</span>}
    </div>
    <form className="chat-composer" onSubmit={e => { e.preventDefault(); send(input) }}>
      <textarea aria-label={t('composer.label')} placeholder={entries.length ? t('composer.followUp') : t('composer.first')} value={input} rows={2} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input) } }} />
      <div className="chat-actions">
        <div className="chat-plan">
          <select aria-label={t('composer.model')} value={model} onChange={e => chooseModel(e.target.value)} disabled={busy || !models.length}>{models.map(m => <option key={m.slug} value={m.slug}>{m.name}</option>)}</select>
          <span>{t.rich('composer.usingPlan', { link: text => <a href={MANAGE_USAGE_URL} target="_blank" rel="noreferrer">{text}</a> })}</span>
          <button type="button" className="icon-btn" aria-label={t('composer.signOut', { email: status.email })} title={t('connect.signOut', { email: status.email })} onClick={disconnect}><LogOut size={14} /></button>
        </div>
        {entries.length > 0 && !busy && <button type="button" className="btn" onClick={() => setEntries([])}><RotateCcw size={14} />{t('composer.newChat')}</button>}
        {busy ? <button type="button" className="btn" onClick={() => abortRef.current?.abort()}><Square size={12} fill="currentColor" />{t('composer.stop')}</button> : <button type="submit" className="btn primary" disabled={!input.trim() || !model}><ArrowUp size={15} />{t('composer.send')}</button>}
      </div>
    </form>
  </div>
}

function RunLocally({ reason, onCopyPrompt }: { reason: string; onCopyPrompt: () => void }) {
  const t = useTranslations('Chat.local')
  return <div className="chat-messages"><div className="chat-empty">
    <Sparkles size={20} />
    <h2>{t('title')}</h2>
    <p>{t('body')}</p>
    <button className="btn primary" onClick={onCopyPrompt}><Copy size={14} />{t('copyPrompt')}</button>
    <details className="chat-local"><summary><MonitorDown size={14} />{t('runHere')}</summary>
      <p>{reason} {t('privacy')}</p>
      <pre className="chat-steps">{`git clone ${REPO_URL}\ncd kiosk-slides\npnpm install\npnpm dev`}</pre>
      <p>{t.rich('then', { url: LOCAL_URL, strong: text => <strong>{text}</strong> })}</p>
    </details>
  </div></div>
}

function AssistantBubble({ text, notes, deck, error, pending }: { text: string; notes: string[]; deck?: string; error?: string; pending?: boolean }) {
  const t = useTranslations('Chat.progress')
  const reply = visibleReply(text)
  return <div className="chat-bubble assistant">
    {notes.map((note, i) => <span key={i} className="chat-note"><RotateCcw size={12} />{note}</span>)}
    {reply.text && <p>{reply.text}</p>}
    {pending && <span className="chat-note"><span className="chat-spinner" />{reply.writing ? t('writing') : t('thinking')}</span>}
    {deck && <span className="chat-note success"><Check size={12} />{t('saved', { name: deck })}</span>}
    {error && <span className="chat-note error"><TriangleAlert size={12} />{error}</span>}
  </div>
}

function errorText(err: unknown, t: ReturnType<typeof useTranslations<'Chat'>>) {
  if (err instanceof RequestError) return err.message || t('errors.requestFailed', { status: err.status })
  return (err as Error).message
}

function storage(key: string, value?: string) {
  try {
    if (value === undefined) return localStorage.getItem(key)
    localStorage.setItem(key, value)
  } catch {}
  return null
}
