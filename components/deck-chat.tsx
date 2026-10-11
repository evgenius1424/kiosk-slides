'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Check, RotateCcw, Sparkles, Square, TriangleAlert } from 'lucide-react'
import { type ChatMessage, streamChat, visibleReply } from '@/lib/chat'

type Entry = ChatMessage & { deck?: boolean; notes?: string[]; error?: string }

const SUGGESTIONS = [
  'Make a 6-slide deck that pitches a four-day work week to leadership',
  'Explain how our onboarding works in five steps for new hires',
  'Tighten the current deck and add a closing metric slide',
]

export function DeckChat({ source, onDeck }: { source: string; onDeck: (source: string) => void }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [input, setInput] = useState('')
  const [live, setLive] = useState<{ text: string; notes: string[] } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const busy = live !== null
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [entries, live])
  useEffect(() => () => abortRef.current?.abort(), [])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    const history = [...entries, { role: 'user' as const, content }]
    setEntries(history); setInput('')
    const controller = new AbortController(); abortRef.current = controller
    let attempt = ''; const notes: string[] = []; let deck = false; let reply = ''; let error = ''
    setLive({ text: '', notes: [] })
    try {
      await streamChat(history.filter(e => e.content).map(({ role, content }) => ({ role, content })), source, event => {
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
  }

  return <div className="chat-panel">
    <div className="chat-messages" ref={listRef} aria-live="polite">
      {!entries.length && !busy && <div className="chat-empty"><Sparkles size={20} /><h2>Describe the deck you need.</h2><p>Claude writes it in the deck format, checks it, and loads it into the editor. Ask for changes any time.</p><div className="chat-suggestions">{SUGGESTIONS.map(s => <button key={s} onClick={() => send(s)}>{s}</button>)}</div></div>}
      {entries.map((entry, i) => entry.role === 'user' ? <div key={i} className="chat-bubble user">{entry.content}</div> : <AssistantBubble key={i} text={entry.content} notes={entry.notes || []} deck={entry.deck} error={entry.error} />)}
      {live && <AssistantBubble text={live.text} notes={live.notes} pending />}
    </div>
    <form className="chat-composer" onSubmit={e => { e.preventDefault(); send(input) }}>
      <textarea aria-label="Message Claude" placeholder={entries.length ? 'Ask for a change…' : 'What is your deck about, and who is it for?'} value={input} rows={2} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input) } }} />
      <div className="chat-actions">
        {entries.length > 0 && !busy && <button type="button" className="btn" onClick={() => setEntries([])}><RotateCcw size={14} />New chat</button>}
        {busy ? <button type="button" className="btn" onClick={() => abortRef.current?.abort()}><Square size={12} fill="currentColor" />Stop</button> : <button type="submit" className="btn primary" disabled={!input.trim()}><ArrowUp size={15} />Send</button>}
      </div>
    </form>
  </div>
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
