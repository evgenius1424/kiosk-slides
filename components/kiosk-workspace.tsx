'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowRight, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Code2, Expand, FileText, Keyboard, Layers2, Monitor, PanelLeftClose, Play, Plus, Presentation, RotateCcw, Settings2, ShieldCheck, Upload, X } from 'lucide-react'
import { downloadFile, exportDeck, parseDeck } from '@/lib/deck'
import { SlideView } from './slide'
import { slideStyles } from '@/lib/slide-styles'

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle ${checked ? 'on' : ''}`} onClick={onChange}><span /></button>
}

export function KioskWorkspace({ initialSource }: { initialSource: string }) {
  const [source, setSource] = useState(initialSource)
  const [draft, setDraft] = useState(initialSource)
  const deck = useMemo(() => parseDeck(source), [source])
  const [index, setIndex] = useState(0)
  const [tab, setTab] = useState<'preview' | 'markdown'>('preview')
  const [theme, setTheme] = useState('room-dark')
  const [accent, setAccent] = useState('#d8b4fe')
  const [motion, setMotion] = useState(true)
  const [safe, setSafe] = useState(false)
  const [duration, setDuration] = useState(deck.duration)
  const [loop, setLoop] = useState(deck.loop)
  const [playing, setPlaying] = useState(false)
  const [presenting, setPresenting] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [sidebar, setSidebar] = useState(true)
  const [modal, setModal] = useState<'help' | 'decks' | null>(null)
  const [fit, setFit] = useState(true)
  const exportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const slides = deck.slides
  const slide = slides[Math.min(index, slides.length - 1)]
  const notice = useCallback((message: string) => setToast(message), [])
  const move = useCallback((delta: number) => { setPlaying(false); setIndex(i => Math.max(0, Math.min(slides.length - 1, i + delta))) }, [slides.length])
  const select = (i: number) => { setPlaying(false); setIndex(i) }
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timer) }, [toast])
  useEffect(() => { if (modal) dialogRef.current?.showModal(); else dialogRef.current?.close() }, [modal])
  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => { if (index === slides.length - 1 && !loop) { setPlaying(false); notice('End of deck'); return } setIndex(i => (i + 1) % slides.length) }, (slide.duration || duration) * 1000)
    return () => clearTimeout(timer)
  }, [playing, index, slides.length, loop, duration, slide.duration, notice])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) return
      if (event.key === 'Escape') { setPresenting(false); setPlaying(false); setModal(null); return }
      if ((event.target as HTMLElement).closest('input,textarea,select,button,dialog') || tab === 'markdown') return
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); move(1) }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); move(-1) }
      if (event.key.toLowerCase() === 'p') { setPlaying(p => !p); notice(playing ? 'Autoscroll off' : 'Autoscroll on') }
      if (event.key.toLowerCase() === 'f') setPresenting(p => !p)
      if (event.key === 'Home') { setIndex(0); setPlaying(false) }
      if (event.key === 'End') { setIndex(slides.length - 1); setPlaying(false) }
    }
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler)
  }, [move, playing, tab, notice, slides.length])
  useEffect(() => {
    const target = canvasRef.current; if (!target) return
    let total = 0; let locked = false; let timer: ReturnType<typeof setTimeout>
    const wheel = (event: WheelEvent) => {
      event.preventDefault(); clearTimeout(timer); timer = setTimeout(() => { locked = false; total = 0 }, 240)
      if (locked) return
      total += event.deltaY * (event.deltaMode === 1 ? 16 : 1)
      if (Math.abs(total) > 65) { move(Math.sign(total)); total = 0; locked = true }
    }
    target.addEventListener('wheel', wheel, { passive: false }); return () => { target.removeEventListener('wheel', wheel); clearTimeout(timer) }
  }, [move, tab, presenting])
  useEffect(() => {
    const target = canvasRef.current; if (!target) return
    const check = () => { const content = target.querySelector('.slide-content'); setFit(!content || content.scrollHeight <= content.clientHeight + 3) }
    const observer = new ResizeObserver(check); observer.observe(target); check(); return () => observer.disconnect()
  }, [index, tab, presenting, slide])
  const apply = () => { try { const next = parseDeck(draft); setSource(draft); setIndex(0); setDuration(next.duration); setLoop(next.loop); setError(''); setTab('preview'); notice('Deck rebuilt successfully') } catch (err) { setError((err as Error).message) } }
  const exportHTML = async () => {
    if (!exportRef.current) return
    setExporting(true)
    try { await exportDeck(exportRef.current, slideStyles, { ...deck, slides, duration, loop }, motion && !safe); notice('Self-contained HTML exported') } catch (err) { notice((err as Error).message) } finally { setExporting(false) }
  }
  const present = () => { setTab('preview'); setPresenting(true); setPlaying(false); (document.activeElement as HTMLElement)?.blur(); notice('Presenting · Esc to return · P to autoplay') }
  const importSource = async (file?: File) => {
    if (!file) return
    if (file.size > 2_000_000) { notice('Please use a Markdown file smaller than 2 MB.'); return }
    const value = await file.text()
    try { const next = parseDeck(value); setSource(value); setDraft(value); setIndex(0); setDuration(next.duration); setLoop(next.loop); setModal(null); setError(''); notice('Markdown deck imported') } catch (err) { setDraft(value); setTab('markdown'); setError((err as Error).message); setModal(null) }
    if (fileRef.current) fileRef.current.value = ''
  }
  return <main className={`workspace ${presenting ? 'is-presenting' : ''} ${sidebar ? '' : 'sidebar-hidden'}`}>
    <input ref={fileRef} type="file" accept=".md,.markdown,text/markdown,text/plain" hidden onChange={e => importSource(e.target.files?.[0])} />
    <header className="app-header">
      <a href="/" className="brand" aria-label="Kiosk Slides home"><span className="brand-icon"><Layers2 size={19} strokeWidth={2.2} /></span><span>Kiosk<span className="brand-light">Slides</span></span><span className="beta">BETA</span></a>
      <div className="header-divider" /><button className="deck-selector" onClick={() => setModal('decks')}>The art of being seen <ChevronDown size={14} /></button>
      <span className="local-label"><span />Local workspace</span>
      <div className="header-actions"><button className="btn" aria-label="Settings" aria-expanded={settingsOpen} aria-controls="deck-settings" onClick={() => setSettingsOpen(!settingsOpen)}><Settings2 size={16} /><span>Settings</span></button><button className="btn export-btn" onClick={exportHTML} disabled={exporting}><ArrowDownToLine size={15} />{exporting ? 'Exporting…' : 'Export HTML'}</button><button className="btn primary" onClick={present}><Play size={14} fill="currentColor" />Present<kbd>F</kbd></button></div>
    </header>
    <aside className="slides-sidebar">
      <div className="sidebar-heading"><span>Slides <span className="count-pill">{slides.length}</span></span><button className="icon-btn" aria-label="Hide slide list" onClick={() => setSidebar(false)}><PanelLeftClose size={16} /></button></div>
      <nav className="slide-list" aria-label="Deck slides">{slides.map((item, i) => <button className={`slide-nav ${index === i ? 'selected' : ''}`} key={i} onClick={() => select(i)} aria-label={`Slide ${i + 1}: ${item.title}`} aria-current={index === i ? 'step' : undefined}><span className="slide-number">{String(i + 1).padStart(2, '0')}</span><span className="thumb-group"><span className="thumbnail"><SlideView slide={item} theme={theme} accent={accent} miniature /></span><span className="thumb-name">{item.title || `Slide ${i + 1}`}</span></span></button>)}</nav>
      <button className="add-slide" onClick={() => { setDraft(source + '\n\n---\n\n:::meta\ntitle: A new idea\n:::\n\n# Make your next ==great point==\n\nKeep it short. Make it matter.\n'); setTab('markdown'); notice('New slide added to source. Edit it, then build your deck.') }}><Plus size={15} />Add a slide</button>
      <div className="sidebar-bottom"><FileText size={14} /><span>example.md</span><button className="icon-btn" aria-label="Download Markdown source" onClick={() => downloadFile(source, 'example.md', 'text/markdown')}><ArrowDownToLine size={14} /></button></div>
    </aside>
    <section className="editor-main">
      <div className="editor-toolbar"><div className="view-tabs">{!sidebar && <button className="icon-btn" aria-label="Show slide list" onClick={() => setSidebar(true)}><Layers2 size={16} /></button>}<button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}><Monitor size={14} />Preview</button><button className={tab === 'markdown' ? 'active' : ''} onClick={() => setTab('markdown')}><Code2 size={15} />Markdown</button></div><span className="ready-label"><CheckCheck size={14} />{fit ? 'Ready for the room' : 'Check slide fit'}</span></div>
      <div className="editor-body">
        {tab === 'preview' ? <><div ref={canvasRef} className={`canvas-shell ${motion && !safe ? 'with-motion' : ''}`} onClick={() => setPlaying(false)}><div key={`${index}-${theme}`} className="canvas-slide"><SlideView slide={slide} theme={theme} accent={accent} /></div></div><div className="canvas-controls"><span><span className="status-dot" />{presenting ? 'Presentation' : '16:9'}<span className="control-separator">/</span>{theme === 'room-dark' ? 'Room dark' : 'Room light'}</span><div className="slide-pagination"><button className="icon-btn" aria-label="Previous slide" onClick={() => move(-1)} disabled={index === 0}><ChevronLeft size={17} /></button><span>{String(index + 1).padStart(2, '0')} <span>/ {String(slides.length).padStart(2, '0')}</span></span><button className="icon-btn" aria-label="Next slide" onClick={() => move(1)} disabled={index === slides.length - 1}><ChevronRight size={17} /></button></div><button className="icon-btn" aria-label="Enter presentation mode" onClick={present}><Expand size={16} /></button></div></> : <div className="source-editor"><div className="source-header"><span><FileText size={14} />example.md</span><button className="btn primary" onClick={apply}><Check size={14} />Build deck</button></div><textarea aria-label="Deck Markdown source" value={draft} onChange={e => setDraft(e.target.value)} spellCheck={false} /><div className={`source-status ${error ? 'error' : ''}`} role="status">{error || 'Edit your Markdown, then build. Your last valid deck stays intact.'}</div></div>}
        <div className="presenter-tip"><Keyboard size={15} /><span>Use <kbd>↑</kbd> <kbd>↓</kbd> or scroll to move.<span className="tip-extra"> <kbd>P</kbd> to autoplay. <kbd>F</kbd> to present.</span></span><button onClick={() => setModal('help')}>All shortcuts <span>↗</span></button></div>

      </div>
      <footer className="workspace-footer"><span><ShieldCheck size={13} />Made for the room. And everyone on the call.</span><span>Quiet by design.</span></footer>
    </section>
    <aside id="deck-settings" className="inspector" hidden={!settingsOpen}><div className="inspector-heading"><Settings2 size={15} /><h2>Deck settings</h2></div><section className="settings-section"><h3>APPEARANCE</h3><label className="field-label" htmlFor="theme">Theme</label><div className="select-wrap"><span className={`theme-swatch ${theme}`} /><select id="theme" value={theme} onChange={e => setTheme(e.target.value)}><option value="room-dark">Room dark</option><option value="room-light">Room light</option></select><ChevronDown size={13} /></div><div className="setting-label">Highlight color</div><div className="color-options">{['#d8b4fe','#c4b5fd','#a5b4fc','#e9d5ff','#c8c3d4'].map(color => <button key={color} className={`color-choice ${accent === color ? 'chosen' : ''}`} style={{ background: color }} aria-label={`Use ${color} highlight`} aria-pressed={accent === color} onClick={() => setAccent(color)}>{accent === color && <Check size={14} />}</button>)}<span>{accent.toUpperCase()}</span></div></section>
      <section className="settings-section"><h3>PLAYBACK</h3><div className="setting-row"><span>Autoplay</span><Toggle checked={playing} onChange={() => { setPlaying(!playing); notice(playing ? 'Autoscroll off' : 'Autoscroll on') }} label="Autoplay" /></div><p className="setting-help">Let your story tell itself.</p><div className="setting-row duration-row"><label htmlFor="duration">Slide duration</label><div className="duration-input"><input id="duration" type="number" min="2" max="120" value={duration} onChange={e => setDuration(Math.max(2, Math.min(120, Number(e.target.value) || 2)))} /><span>sec</span></div></div><div className="setting-row"><span>Loop presentation</span><Toggle checked={loop} onChange={() => setLoop(!loop)} label="Loop presentation" /></div><div className="mini-note"><RotateCcw size={12} /><span>Starts paused. Always in your control.</span></div></section>
      <section className="settings-section"><h3>MOTION & PERFORMANCE</h3><label className="field-label" htmlFor="transition">Slide transition</label><div className="select-wrap"><select id="transition" value={motion ? 'gentle' : 'none'} disabled={safe} onChange={e => setMotion(e.target.value === 'gentle')}><option value="gentle">Gentle fade</option><option value="none">None · instant</option></select><ChevronDown size={13} /></div><div className="setting-row safe-row"><span>Screen-share safe</span><Toggle checked={safe} onChange={() => { setSafe(!safe); notice(!safe ? 'Screen-share safe · motion disabled' : 'Screen-share safe off') }} label="Screen-share safe" /></div><p className="setting-help">Still visuals. No transitions.<br />Less work for your GPU.</p><div className="performance-note"><ShieldCheck size={16} /><div><strong>Clarity comes first.</strong><p>Your message stays readable,<br />even when frames get dropped.</p></div></div></section>
      <div className="build-panel"><div><span className="status-dot" /><strong>{fit ? 'Deck is ready' : 'Review layout'}</strong><span>{slides.length} slides</span></div><p><Check size={12} />Markdown validated</p><p><Check size={12} />{fit ? 'Current slide fits the canvas' : 'Content may overflow'}</p><p><Check size={12} />No live GPU simulation</p></div><button className="shortcuts-button" onClick={() => setModal('help')}><CircleHelp size={15} />A little help goes a long way<ArrowRight size={13} /></button>
    </aside>
    <div className="export-stage" ref={exportRef} aria-hidden="true">{slides.map((s, i) => <div className="portable-slide" key={i}><SlideView slide={s} theme={theme} accent={accent} /></div>)}</div>
    {toast && <div className="toast" role="status"><Check size={15} />{toast}</div>}
    <dialog ref={dialogRef} className="workspace-dialog" onCancel={() => setModal(null)} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}><div className="dialog-heading"><h2>{modal === 'help' ? 'Make yourself at home.' : 'Your local workspace'}</h2><button className="icon-btn" aria-label="Close dialog" onClick={() => setModal(null)}><X size={18} /></button></div>{modal === 'help' ? <><p>Everything you need. Nothing in the way.</p><dl className="shortcut-list">{[['Next slide','↓ / → / Page Down'],['Previous slide','↑ / ← / Page Up'],['Toggle autoplay','P'],['Presentation mode','F'],['Leave presentation','Esc'],['First / last slide','Home / End']].map(([name, key]) => <div key={name}><dt>{name}</dt><dd><kbd>{key}</kbd></dd></div>)}</dl><div className="dialog-note">Scroll over the canvas to move one slide at a time. Click the presentation or navigate to pause autoplay. Download Markdown to keep your edits; this workspace does not save them after refresh.</div></> : <><p>Open a Markdown deck, or start with the example.</p><button className="deck-option" onClick={() => { setSource(initialSource); setDraft(initialSource); setIndex(0); setModal(null); setDuration(12); setLoop(true) }}><Presentation size={24} /><span><strong>The art of being seen</strong><small>Example deck · 7 slides</small></span><ArrowRight size={17} /></button><button className="btn import-button" onClick={() => fileRef.current?.click()}><Upload size={16} />Import Markdown</button><p className="dialog-note">Export a self-contained HTML file to present offline. Download your Markdown to keep an editable copy.</p></>}</dialog>
  </main>
}
