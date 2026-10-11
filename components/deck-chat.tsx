'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Check, ExternalLink, LogOut, MonitorDown, RotateCcw, Sparkles, Square, TriangleAlert } from 'lucide-react'
import { type ChatGPTModel, type ChatGPTStatus, type ChatMessage, MANAGE_USAGE_URL, connectChatGPT, disconnectChatGPT, fetchModels, fetchStatus, streamChat, visibleReply } from '@/lib/chat'

type Entry = ChatMessage & { deck?: boolean; notes?: string[]; error?: string }

const SUGGESTIONS = [
  'Make a 6-slide deck that pitches a four-day work week to leadership',
  'Explain how our onboarding works in five steps for new hires',
  'Tighten the current deck and add a closing metric slide',
]
const MODEL_KEY = 'kiosk-chatgpt-model'
const WELCOME_KEY = 'kiosk-chatgpt-welcomed'
const REPO_URL = 'https://github.com/evgenius1424/kiosk-slides'

export function DeckChat({ source, onDeck, onOpen }: { source: string; onDeck: (source: string) => void; onOpen: () => void }) {
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
    try { setStatus(await fetchStatus()) } catch (err) { setStatus({ available: false, reason: (err as Error).message }) }
  }, [])
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
      if (!list.length) setNotice('No ChatGPT models are available for this account.')
    }).catch(err => setNotice((err as Error).message))
  }, [ready])
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [entries, live])
  useEffect(() => () => abortRef.current?.abort(), [])

  const connect = async () => {
    setConnecting(true); setNotice('')
    try { await connectChatGPT() } catch (err) { setNotice((err as Error).message); setConnecting(false) }
  }
  const disconnect = async () => {
    abortRef.current?.abort()
    try {
      const { revoked } = await disconnectChatGPT()
      setNotice(revoked ? '' : 'Signed out here, but ChatGPT didn’t confirm it. You can also disconnect Kiosk Slides in ChatGPT settings.')
    } catch (err) { setNotice((err as Error).message) }
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
    let attempt = ''; const notes: string[] = []; let deck = false; let reply = ''; let error = ''
    setLive({ text: '', notes: [] })
    try {
      await streamChat(history.filter(e => e.content).map(({ role, content }) => ({ role, content })), source, model, event => {
        if (event.type === 'text') attempt += event.text
        if (event.type === 'retry') { notes.push(`Fixing: ${event.error}`); attempt = '' }
        if (event.type === 'deck') { deck = true; onDeck(event.source) }
        if (event.type === 'done') reply = event.reply
        if (event.type === 'error') error = event.message
        setLive({ text: attempt, notes: [...notes] })
      }, controller.signal)
    } catch (err) {
      error = controller.signal.aborted ? 'Generation stopped.' : (err as Error).message
    }
    setEntries(current => [...current, { role: 'assistant', content: reply || '', deck, notes, error }])
    setLive(null); abortRef.current = null
    if (/sign-in|session|connect again/i.test(error)) refresh()
  }

  if (!status) return <div className="chat-panel"><div className="chat-empty"><span className="chat-spinner" /></div></div>
  if (!status.available) return <div className="chat-panel"><RunLocally reason={status.reason} /></div>
  if (!status.connected || !status.planUsage) return <div className="chat-panel"><div className="chat-messages"><div className="chat-empty">
    <Sparkles size={20} />
    <h2>Write decks with your ChatGPT plan.</h2>
    <p>{status.connected ? `You’re signed in as ${status.email}, but ChatGPT plan usage wasn’t allowed. Connect again and allow it to generate decks.` : 'Describe your talk and ChatGPT writes the deck, checks it, and loads it into the editor. Your sign-in stays on this computer.'}</p>
    <button className="btn primary chatgpt-button" onClick={connect} disabled={connecting}>{connecting ? 'Opening ChatGPT…' : 'Continue with ChatGPT'}</button>
    <p className="chat-fineprint">Eligible AI requests use your ChatGPT plan, not a Kiosk Slides subscription. Kiosk Slides doesn’t charge for them. You can manage usage in ChatGPT settings.</p>
    {status.connected && <button className="link-button" onClick={disconnect}>Sign out of {status.email}</button>}
    {notice && <span className="chat-note error"><TriangleAlert size={12} />{notice}</span>}
  </div></div></div>

  return <div className="chat-panel">
    {welcome && <div className="chat-welcome" role="dialog" aria-modal="true" aria-labelledby="chatgpt-welcome-title"><div>
      <h2 id="chatgpt-welcome-title">You’re connected to ChatGPT</h2>
      <p>AI requests in Kiosk Slides now use your ChatGPT plan. Kiosk Slides doesn’t charge for them, and your plan’s usage limits apply.</p>
      <div className="chat-actions"><a className="btn" href={MANAGE_USAGE_URL} target="_blank" rel="noreferrer">Manage usage<ExternalLink size={13} /></a><button className="btn primary" onClick={dismissWelcome} autoFocus>Got it</button></div>
    </div></div>}
    <div className="chat-messages" ref={listRef} aria-live="polite">
      {!entries.length && !busy && <div className="chat-empty"><Sparkles size={20} /><h2>Describe the deck you need.</h2><p>ChatGPT writes it in the deck format, checks it, and loads it into the editor. Ask for changes any time.</p><div className="chat-suggestions">{SUGGESTIONS.map(s => <button key={s} onClick={() => send(s)} disabled={!model}>{s}</button>)}</div></div>}
      {entries.map((entry, i) => entry.role === 'user' ? <div key={i} className="chat-bubble user">{entry.content}</div> : <AssistantBubble key={i} text={entry.content} notes={entry.notes || []} deck={entry.deck} error={entry.error} />)}
      {live && <AssistantBubble text={live.text} notes={live.notes} pending />}
      {notice && <span className="chat-note error"><TriangleAlert size={12} />{notice}</span>}
    </div>
    <form className="chat-composer" onSubmit={e => { e.preventDefault(); send(input) }}>
      <textarea aria-label="Message ChatGPT" placeholder={entries.length ? 'Ask for a change…' : 'What is your deck about, and who is it for?'} value={input} rows={2} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input) } }} />
      <div className="chat-actions">
        <div className="chat-plan">
          <select aria-label="ChatGPT model" value={model} onChange={e => chooseModel(e.target.value)} disabled={busy || !models.length}>{models.map(m => <option key={m.slug} value={m.slug}>{m.name}</option>)}</select>
          <span>Using ChatGPT plan · <a href={MANAGE_USAGE_URL} target="_blank" rel="noreferrer">Manage usage</a></span>
          <button type="button" className="icon-btn" aria-label={`Sign out of ChatGPT (${status.email})`} title={`Sign out of ${status.email}`} onClick={disconnect}><LogOut size={14} /></button>
        </div>
        {entries.length > 0 && !busy && <button type="button" className="btn" onClick={() => setEntries([])}><RotateCcw size={14} />New chat</button>}
        {busy ? <button type="button" className="btn" onClick={() => abortRef.current?.abort()}><Square size={12} fill="currentColor" />Stop</button> : <button type="submit" className="btn primary" disabled={!input.trim() || !model}><ArrowUp size={15} />Send</button>}
      </div>
    </form>
  </div>
}

function RunLocally({ reason }: { reason: string }) {
  return <div className="chat-messages"><div className="chat-empty">
    <MonitorDown size={20} />
    <h2>Run Kiosk Slides on your computer to use your ChatGPT plan.</h2>
    <p>{reason} Your ChatGPT sign-in is stored only on the computer running the app, so it never reaches this website.</p>
    <pre className="chat-steps">{`git clone ${REPO_URL}\ncd kiosk-slides\npnpm install\npnpm dev`}</pre>
    <p>Then open <strong>http://127.0.0.1:3000</strong> and choose Ask AI.</p>
  </div></div>
}

function AssistantBubble({ text, notes, deck, error, pending }: { text: string; notes: string[]; deck?: boolean; error?: string; pending?: boolean }) {
  const reply = visibleReply(text)
  return <div className="chat-bubble assistant">
    {notes.map((note, i) => <span key={i} className="chat-note"><RotateCcw size={12} />{note}</span>)}
    {reply.text && <p>{reply.text}</p>}
    {pending && <span className="chat-note"><span className="chat-spinner" />{reply.writing ? 'Writing slides…' : 'Thinking…'}</span>}
    {deck && <span className="chat-note success"><Check size={12} />Deck loaded into the editor</span>}
    {error && <span className="chat-note error"><TriangleAlert size={12} />{error}</span>}
  </div>
}

function storage(key: string, value?: string) {
  try {
    if (value === undefined) return localStorage.getItem(key)
    localStorage.setItem(key, value)
  } catch {}
  return null
}
