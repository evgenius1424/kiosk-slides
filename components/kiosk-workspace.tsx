'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowRight, BookOpen, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Code2, Copy, Expand, FileText, Keyboard, Layers2, Monitor, PanelLeftClose, Play, Plus, RotateCcw, Settings2, ShieldCheck, Sparkles, X } from 'lucide-react'
import { DEFAULT_BRAND, downloadFile, fonts, parseDeck, setFrontMatter, tones, type Scale, type Slide, type Theme } from '@/lib/deck'
import { DEFAULT_TRANSITION, SHARE_SAFE_HELP, TRANSITION_MS, activeTransition, transitions, type ActiveTransition, type Transition } from '@/lib/transitions'
import { BLANK_DECK, DEFAULT_NAME, createPresentation, deckName, loadLibrary, saveLibrary, uniqueName, type Library } from '@/lib/presentations'
import { DeckChat } from './deck-chat'
import { PresentationMenu } from './presentation-menu'
import { SlideView } from './slide'

const SWIPE_DISTANCE = 45
const FORMAT_RULES = [
  ['---', 'A line with only three dashes starts a new slide. Optional front matter at the very top sets title, theme, font, scale, brand and autoplay.'],
  ['# Heading', 'Exactly one per slide, up to 115 characters. Wrap the key phrase in **bold** to highlight it.'],
  ['Body', 'Plain paragraphs under the heading, up to 320 characters per slide.'],
  ['Widget', 'At most one per slide: steps (1. 2. 3.), a code block, an image, a table, a Before | After table, or an annotated chart, metric, flow or buttons.'],
  ['<!-- settings -->', 'An optional comment right above the heading sets title, label, footer, layout and duration.'],
]

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle ${checked ? 'on' : ''}`} onClick={onChange}><span /></button>
}

export function KioskWorkspace({ example, help }: { example: string; help: { guide: string; prompt: string } }) {
  const [library, setLibrary] = useState<Library>(() => ({ current: 'example', items: [{ id: 'example', name: deckName(example) || DEFAULT_NAME, source: example, userNamed: true, updatedAt: 0 }] }))
  const [loaded, setLoaded] = useState(false)
  const [chatKey, setChatKey] = useState(0)
  const [source, setSource] = useState(example)
  const [draft, setDraft] = useState(example)
  const deck = useMemo(() => parseDeck(source), [source])
  const [index, setIndex] = useState(0)
  const [tab, setTab] = useState<'preview' | 'markdown' | 'chat'>('preview')
  const [accent, setAccent] = useState<string>(tones[0].color)
  const [transition, setTransition] = useState<Transition>(DEFAULT_TRANSITION)
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
  const [modal, setModal] = useState<'help' | 'format' | null>(null)
  const [fit, setFit] = useState(true)
  const [idle, setIdle] = useState(false)
  const [brandDraft, setBrandDraft] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const slides = deck.slides
  const current = library.items.find(p => p.id === library.current) ?? library.items[0]
  const theme = deck.theme
  const look = { font: deck.font, scale: deck.scale, brand: deck.brand }
  // The deck's front matter owns these settings, so the controls rewrite them in the source and the unbuilt draft.
  const setFront = (key: string, value?: string) => { setSource(s => setFrontMatter(s, key, value)); setDraft(d => setFrontMatter(d, key, value)) }
  const setTheme = (next: Theme) => setFront('theme', next)
  const slide = slides[Math.min(index, slides.length - 1)]
  const motion = activeTransition(transition, safe)
  const change = useSlideChange(index, slide, motion)
  const notice = useCallback((message: string) => setToast(message), [])
  const toggleSafe = useCallback(() => { notice(safe ? 'Screen-share safe off' : 'Screen-share safe on · quick flat fades'); setSafe(!safe) }, [safe, notice])
  const move = useCallback((delta: number) => { setPlaying(false); setIndex(i => Math.max(0, Math.min(slides.length - 1, i + delta))) }, [slides.length])
  const select = (i: number) => { setPlaying(false); setIndex(i) }
  const present = useCallback(() => {
    setTab('preview'); setPresenting(true); setPlaying(false); (document.activeElement as HTMLElement)?.blur()
    enterFullscreen()
    notice(matchMedia('(hover: none)').matches ? 'Swipe to change slides' : 'Esc to exit · P to autoplay')
  }, [notice])
  const leave = useCallback(() => { setPresenting(false); setPlaying(false); if (fullscreenElement()) exitFullscreen() }, [])
  useEffect(() => { const next = loadLibrary(example); setLibrary(next); show(next.items.find(p => p.id === next.current)!.source); setLoaded(true) }, [example])
  useEffect(() => { if (loaded) saveLibrary(library) }, [library, loaded])
  useEffect(() => { setLibrary(l => ({ ...l, items: l.items.map(p => p.id === l.current && p.source !== source ? { ...p, source, updatedAt: Date.now() } : p) })) }, [source])
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
      if (event.key === 'Escape') { leave(); setModal(null); return }
      if ((event.target as HTMLElement).closest('input,textarea,select,button,dialog') || tab !== 'preview') return
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); move(1) }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); move(-1) }
      if (event.key.toLowerCase() === 'p') { setPlaying(p => !p); notice(playing ? 'Autoscroll off' : 'Autoscroll on') }
      if (event.key.toLowerCase() === 'f') { if (presenting) leave(); else present() }
      if (event.key.toLowerCase() === 's') toggleSafe()
      if (event.key === 'Home') { setIndex(0); setPlaying(false) }
      if (event.key === 'End') { setIndex(slides.length - 1); setPlaying(false) }
    }
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler)
  }, [move, playing, tab, notice, slides.length, presenting, present, leave, toggleSafe])
  useEffect(() => {
    const target = canvasRef.current; if (!target) return
    let total = 0; let locked = false; let timer: ReturnType<typeof setTimeout>
    const wheel = (event: WheelEvent) => {
      event.preventDefault(); clearTimeout(timer); timer = setTimeout(() => { locked = false; total = 0 }, 240)
      if (locked) return
      total += event.deltaY * (event.deltaMode === 1 ? 16 : 1)
      if (Math.abs(total) > 65) { move(Math.sign(total)); total = 0; locked = true }
    }
    const stopSwipe = onSwipe(target, move, presenting)
    target.addEventListener('wheel', wheel, { passive: false }); return () => { target.removeEventListener('wheel', wheel); stopSwipe(); clearTimeout(timer) }
  }, [move, tab, presenting])
  useEffect(() => {
    const exited = () => { if (!fullscreenElement()) { setPresenting(false); setPlaying(false) } }
    document.addEventListener('fullscreenchange', exited); document.addEventListener('webkitfullscreenchange', exited)
    return () => { document.removeEventListener('fullscreenchange', exited); document.removeEventListener('webkitfullscreenchange', exited) }
  }, [])
  useEffect(() => {
    if (!presenting) return
    let timer: ReturnType<typeof setTimeout>
    const wake = () => { setIdle(false); clearTimeout(timer); timer = setTimeout(() => setIdle(true), 2600) }
    wake(); window.addEventListener('pointermove', wake); window.addEventListener('pointerdown', wake)
    return () => { window.removeEventListener('pointermove', wake); window.removeEventListener('pointerdown', wake); clearTimeout(timer); setIdle(false) }
  }, [presenting])
  useEffect(() => {
    const target = canvasRef.current; if (!target) return
    const check = () => { const content = target.querySelector('.slide-content'); setFit(!content || content.scrollHeight <= content.clientHeight + 3) }
    const observer = new ResizeObserver(check); observer.observe(target); check(); return () => observer.disconnect()
  }, [index, tab, presenting, slide])
  function show(value: string) {
    try { const next = parseDeck(value); setSource(value); setDraft(value); setDuration(next.duration); setLoop(next.loop); setError('') } catch (err) { setSource(BLANK_DECK); setDraft(value); setTab('markdown'); setError((err as Error).message) }
    setIndex(0); setPlaying(false)
  }
  const keepsDraft = () => draft === source || confirm('Your Markdown has changes you haven’t built. Discard them?')
  const openPresentation = (id: string) => {
    const target = library.items.find(p => p.id === id)
    if (!target || id === current.id || !keepsDraft()) return
    setLibrary(l => ({ ...l, current: id })); show(target.source); setChatKey(k => k + 1)
  }
  const newPresentation = () => {
    if (!keepsDraft()) return
    const created = createPresentation(DEFAULT_NAME, BLANK_DECK, library.items)
    setLibrary(l => ({ current: created.id, items: [...l.items, created] })); show(BLANK_DECK); setChatKey(k => k + 1); setTab('markdown')
    notice(`${created.name} created · write, paste, or ask AI`)
  }
  const renamePresentation = (id: string, name: string) => setLibrary(l => ({ ...l, items: l.items.map(p => p.id === id ? { ...p, name: uniqueName(name, l.items, id), userNamed: true } : p) }))
  const deletePresentation = (id: string) => {
    const rest = library.items.filter(p => p.id !== id)
    if (id !== current.id) { setLibrary(l => ({ ...l, items: rest })); return }
    const next = rest.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? createPresentation(DEFAULT_NAME, BLANK_DECK, [])
    setLibrary({ current: next.id, items: rest.length ? rest : [next] }); show(next.source); setChatKey(k => k + 1)
  }
  const apply = () => { try { const next = parseDeck(draft); setSource(draft); setIndex(0); setDuration(next.duration); setLoop(next.loop); setError(''); setTab('preview'); notice('Deck built and saved') } catch (err) { setError((err as Error).message) } }
  const loadGenerated = (value: string, fresh: boolean) => {
    const name = deckName(value) || DEFAULT_NAME
    const reuse = !fresh || current.source === BLANK_DECK
    const target = reuse ? { ...current, name: current.userNamed ? current.name : uniqueName(name, library.items, current.id) } : createPresentation(name, value, library.items)
    setLibrary(l => ({ current: target.id, items: reuse ? l.items.map(p => p.id === target.id ? { ...p, name: p.userNamed ? p.name : target.name, source: value, updatedAt: Date.now() } : p) : [...l.items, target] }))
    const next = parseDeck(value); setSource(value); setDraft(value); setIndex(0); setDuration(next.duration); setLoop(next.loop); setError('')
    notice(`${target.name} · ${next.slides.length} ${next.slides.length === 1 ? 'slide' : 'slides'}`)
    return target.name
  }
  const copyPrompt = async () => {
    try { await navigator.clipboard.writeText(help.prompt); notice('Prompt copied · paste it into any AI chat') } catch { notice('Couldn’t copy. Select the prompt below and copy it.') }
  }
  const exportHTML = async () => {
    setExporting(true)
    try { const { deckHtml, fetchAsDataUrl } = await import('./slide/deck-html'); downloadFile(await deckHtml({ ...deck, title: current.name, slides, duration, loop }, { theme, tone: accent, transition, shareSafe: safe, embedImage: fetchAsDataUrl, embedFont: file => fetchAsDataUrl(`/fonts/${file}`) }), `${fileName(current.name)}.html`, 'text/html'); notice('Self-contained HTML exported') } catch (err) { notice((err as Error).message) } finally { setExporting(false) }
  }
  return <main className={`workspace ${presenting ? 'is-presenting' : ''} ${presenting && idle ? 'is-idle' : ''} ${sidebar ? '' : 'sidebar-hidden'}`}>
    <header className="app-header">
      <a href="/" className="brand" aria-label="Kiosk Slides home"><span className="brand-icon"><Layers2 size={19} strokeWidth={2.2} /></span><span>Kiosk<span className="brand-light">Slides</span></span><span className="beta">BETA</span></a>
      <div className="header-divider" /><PresentationMenu items={library.items} current={current} onOpen={openPresentation} onCreate={newPresentation} onRename={renamePresentation} onDelete={deletePresentation} />
      <span className="local-label"><span />Local workspace</span>
      <div className="header-actions"><button className="btn" aria-label="Settings" aria-expanded={settingsOpen} aria-controls="deck-settings" onClick={() => setSettingsOpen(!settingsOpen)}><Settings2 size={16} /><span>Settings</span></button><button className="btn export-btn" onClick={exportHTML} disabled={exporting}><ArrowDownToLine size={15} />{exporting ? 'Exporting…' : 'Export HTML'}</button><button className="btn primary" onClick={present}><Play size={14} fill="currentColor" /><span>Present</span><kbd>F</kbd></button></div>
    </header>
    <aside className="slides-sidebar">
      <div className="sidebar-heading"><span>Slides <span className="count-pill">{slides.length}</span></span><button className="icon-btn" aria-label="Hide slide list" onClick={() => setSidebar(false)}><PanelLeftClose size={16} /></button></div>
      <nav className="slide-list" aria-label="Deck slides">{slides.map((item, i) => <button className={`slide-nav ${index === i ? 'selected' : ''}`} key={i} onClick={() => select(i)} aria-label={`Slide ${i + 1}: ${item.title}`} aria-current={index === i ? 'step' : undefined}><span className="slide-number">{String(i + 1).padStart(2, '0')}</span><span className="thumb-group"><span className="thumbnail"><SlideView slide={item} theme={theme} accent={accent} look={look} miniature /></span><span className="thumb-name">{item.title || `Slide ${i + 1}`}</span></span></button>)}</nav>
      <button className="add-slide" onClick={() => { setDraft(source + '\n\n---\n\n<!--\ntitle: A new idea\n-->\n\n# Make your next **great point**\n\nKeep it short. Make it matter.\n'); setTab('markdown'); notice('New slide added to source. Edit it, then build your deck.') }}><Plus size={15} />Add a slide</button>
    </aside>
    <section className="editor-main">
      <div className="editor-toolbar"><div className="view-tabs">{!sidebar && <button className="icon-btn" aria-label="Show slide list" onClick={() => setSidebar(true)}><Layers2 size={16} /></button>}<button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}><Monitor size={14} />Preview</button><button className={tab === 'markdown' ? 'active' : ''} onClick={() => setTab('markdown')}><Code2 size={15} />Markdown</button><button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}><Sparkles size={14} />Ask AI</button></div><span className="ready-label"><CheckCheck size={14} />{fit ? 'Ready for the room' : 'Check slide fit'}</span></div>
      <div className={`editor-body ${tab !== 'preview' ? 'markdown-body' : ''}`}>
        <div className="chat-host" hidden={tab !== 'chat'}><DeckChat key={chatKey} source={source} onDeck={loadGenerated} onOpen={() => setTab('chat')} /></div>
        {tab === 'chat' ? null : tab === 'preview' ? <><div ref={canvasRef} className={`canvas-shell slide-backdrop ${theme}`} data-transition={motion} style={{ '--slide-tone': accent, '--kt-dir': change.direction } as React.CSSProperties} onClick={() => setPlaying(false)}>{change.leaving && <div key={`leave-${change.count}`} className="canvas-slide kt-leave" aria-hidden="true"><SlideView slide={change.leaving} theme={theme} accent={accent} look={look} /></div>}<div key={`slide-${index}`} className={`canvas-slide ${change.leaving ? 'kt-enter' : ''}`}><SlideView slide={slide} theme={theme} accent={accent} look={look} /></div></div><div className="canvas-controls"><span><span className="status-dot" />{presenting ? 'Presentation' : '16:9'}<span className="control-separator">/</span>{theme === 'room-dark' ? 'Room dark' : 'Room light'}</span><div className="slide-pagination"><button className="icon-btn" aria-label="Previous slide" onClick={() => move(-1)} disabled={index === 0}><ChevronLeft size={17} /></button><span>{String(index + 1).padStart(2, '0')} <span>/ {String(slides.length).padStart(2, '0')}</span></span><button className="icon-btn" aria-label="Next slide" onClick={() => move(1)} disabled={index === slides.length - 1}><ChevronRight size={17} /></button></div><button className="icon-btn" aria-label="Enter presentation mode" onClick={present}><Expand size={16} /></button></div>{presenting && <button className="present-exit" aria-label="Leave presentation" onClick={leave}><X size={20} /></button>}</> : <div className="source-editor"><div className="source-header"><span><FileText size={14} />{current.name}</span><div><button className="btn" onClick={() => setModal('format')}><BookOpen size={14} />Markdown help</button><button className="btn primary" onClick={apply}><Check size={14} />Build deck</button></div></div><textarea aria-label="Deck Markdown source" value={draft} onChange={e => setDraft(e.target.value)} spellCheck={false} /><div className={`source-status ${error ? 'error' : ''}`} role="status">{error || 'Write or paste your Markdown, then build. Built decks are saved in this browser.'}</div></div>}
        <div className="presenter-tip" hidden={tab !== 'preview'}><Keyboard size={15} /><span>Use <kbd>↑</kbd> <kbd>↓</kbd> or scroll to move.<span className="tip-extra"> <kbd>P</kbd> to autoplay. <kbd>F</kbd> to present.</span></span><button onClick={() => setModal('help')}>All shortcuts <span>↗</span></button></div>

      </div>
      <footer className="workspace-footer"><span><ShieldCheck size={13} />Made for the room. And everyone on the call.</span><span>Quiet by design.</span></footer>
    </section>
    <aside id="deck-settings" className="inspector" hidden={!settingsOpen}><div className="inspector-heading"><Settings2 size={15} /><h2>Deck settings</h2></div><section className="settings-section"><h3>APPEARANCE</h3><label className="field-label" htmlFor="theme">Theme</label><div className="select-wrap"><span className={`theme-swatch ${theme}`} /><select id="theme" value={theme} onChange={e => setTheme(e.target.value as Theme)}><option value="room-dark">Room dark</option><option value="room-light">Room light</option></select><ChevronDown size={13} /></div><div className="setting-label">Background tone</div><div className="color-options">{tones.map(({ name, color }) => <button key={color} className={`color-choice ${accent === color ? 'chosen' : ''}`} style={{ background: color }} title={name} aria-label={`${name} background`} aria-pressed={accent === color} onClick={() => setAccent(color)}>{accent === color && <Check size={14} />}</button>)}</div><p className="setting-help">Quiet color in the background, and on highlighted heading words.</p><label className="field-label" htmlFor="font">Font</label><div className="select-wrap"><select id="font" value={look.font} onChange={e => setFront('font', e.target.value === fonts[0].id ? undefined : e.target.value)}>{fonts.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select><ChevronDown size={13} /></div><label className="field-label" htmlFor="scale">Text size</label><div className="select-wrap"><select id="scale" value={look.scale} onChange={e => setFront('scale', e.target.value === 'normal' ? undefined : e.target.value as Scale)}><option value="normal">Normal</option><option value="large">Large</option><option value="kiosk">Kiosk · read from across the room</option></select><ChevronDown size={13} /></div><div className="setting-row"><label htmlFor="brand">Brand</label><Toggle checked={!!look.brand} onChange={() => setFront('brand', look.brand ? 'none' : undefined)} label="Show brand" /></div>{look.brand && <input id="brand" className="brand-input" maxLength={24} placeholder={DEFAULT_BRAND} value={brandDraft ?? (look.brand === DEFAULT_BRAND ? '' : look.brand)} onChange={e => { const text = e.target.value; setBrandDraft(text); setFront('brand', text.trim() && text.trim() !== 'none' ? text.trim() : undefined) }} onBlur={() => setBrandDraft(null)} />}<p className="setting-help">Shown in the corner of every slide. Leave empty for kiosk.</p></section>
      <section className="settings-section"><h3>PLAYBACK</h3><div className="setting-row"><span>Autoplay</span><Toggle checked={playing} onChange={() => { setPlaying(!playing); notice(playing ? 'Autoscroll off' : 'Autoscroll on') }} label="Autoplay" /></div><p className="setting-help">Let your story tell itself.</p><div className="setting-row duration-row"><label htmlFor="duration">Slide duration</label><div className="duration-input"><input id="duration" type="number" min="2" max="120" value={duration} onChange={e => setDuration(Math.max(2, Math.min(120, Number(e.target.value) || 2)))} /><span>sec</span></div></div><div className="setting-row"><span>Loop presentation</span><Toggle checked={loop} onChange={() => setLoop(!loop)} label="Loop presentation" /></div><div className="mini-note"><RotateCcw size={12} /><span>Starts paused. Always in your control.</span></div></section>
      <section className="settings-section"><h3>MOTION & PERFORMANCE</h3><label className="field-label" htmlFor="transition">Slide transition</label><div className="select-wrap"><select id="transition" value={transition} disabled={safe} onChange={e => setTransition(e.target.value as Transition)}>{transitions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select><ChevronDown size={13} /></div><p className="setting-help">{safe ? 'Screen-share safe is on, so every transition becomes a quick flat fade.' : transitions.find(t => t.id === transition)!.help}</p><div className="setting-row safe-row"><span>Screen-share safe</span><Toggle checked={safe} onChange={toggleSafe} label="Screen-share safe" /></div><p className="setting-help">{SHARE_SAFE_HELP}</p><div className="performance-note"><ShieldCheck size={16} /><div><strong>Clarity comes first.</strong><p>Your message stays readable,<br />even when frames get dropped.</p></div></div></section>
      <div className="build-panel"><div><span className="status-dot" /><strong>{fit ? 'Deck is ready' : 'Review layout'}</strong><span>{slides.length} slides</span></div><p><Check size={12} />Markdown validated</p><p><Check size={12} />{fit ? 'Current slide fits the canvas' : 'Content may overflow'}</p><p><Check size={12} />No live GPU simulation</p></div><button className="shortcuts-button" onClick={() => setModal('help')}><CircleHelp size={15} />A little help goes a long way<ArrowRight size={13} /></button>
    </aside>
    {toast && <div className="toast" role="status"><Check size={15} />{toast}</div>}
    <dialog ref={dialogRef} className={`workspace-dialog ${modal === 'format' ? 'wide' : ''}`} onCancel={() => setModal(null)} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}><div className="dialog-heading"><h2>{modal === 'format' ? 'Writing slides in Markdown' : 'Make yourself at home.'}</h2><button className="icon-btn" aria-label="Close dialog" onClick={() => setModal(null)}><X size={18} /></button></div>{modal === 'format' ? <>
      <p>Write slides by hand, paste a deck from any AI, or use Ask AI.</p>
      <div className="prompt-card"><div><strong>Use another AI</strong><p>Copy this prompt into Gemini, ChatGPT or Claude and describe your talk. Paste the deck it returns into the editor, then build.</p></div><button className="btn primary" onClick={copyPrompt}><Copy size={14} />Copy prompt</button></div>
      <h3 className="format-heading">The essentials</h3>
      <dl className="format-rules">{FORMAT_RULES.map(([term, rule]) => <div key={term}><dt><code>{term}</code></dt><dd>{rule}</dd></div>)}</dl>
      <details className="format-details"><summary>Full format reference</summary><pre>{help.guide}</pre></details>
      <details className="format-details"><summary>Show the prompt</summary><pre>{help.prompt}</pre></details>
    </> : <><p>Everything you need. Nothing in the way.</p><dl className="shortcut-list">{[['Next slide','↓ / → / Page Down'],['Previous slide','↑ / ← / Page Up'],['Toggle autoplay','P'],['Presentation mode','F'],['Screen-share safe','S'],['Leave presentation','Esc'],['First / last slide','Home / End']].map(([name, key]) => <div key={name}><dt>{name}</dt><dd><kbd>{key}</kbd></dd></div>)}</dl><div className="dialog-note">Scroll over the canvas to move one slide at a time. Click the presentation or navigate to pause autoplay. Presentations are saved in this browser; switch or create them from the menu at the top.</div></>}</dialog>
  </main>
}

function fileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'kiosk-slides'
}

function onSwipe(target: HTMLElement, move: (delta: number) => void, vertical: boolean) {
  let start: { x: number; y: number } | null = null
  const down = (event: TouchEvent) => { start = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null }
  const up = (event: TouchEvent) => {
    if (!start) return
    const dx = event.changedTouches[0].clientX - start.x
    const dy = event.changedTouches[0].clientY - start.y
    start = null
    const distance = vertical && Math.abs(dy) > Math.abs(dx) ? dy : Math.abs(dx) > Math.abs(dy) * 1.2 ? dx : 0
    if (Math.abs(distance) > SWIPE_DISTANCE) move(distance < 0 ? 1 : -1)
  }
  target.addEventListener('touchstart', down, { passive: true }); target.addEventListener('touchend', up)
  return () => { target.removeEventListener('touchstart', down); target.removeEventListener('touchend', up) }
}

type WebkitDocument = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void }
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => void }

function fullscreenElement() {
  return document.fullscreenElement ?? (document as WebkitDocument).webkitFullscreenElement ?? null
}

function enterFullscreen() {
  const root = document.documentElement as WebkitElement
  if (root.requestFullscreen) root.requestFullscreen().catch(() => {})
  else root.webkitRequestFullscreen?.()
}

function exitFullscreen() {
  if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
  else (document as WebkitDocument).webkitExitFullscreen?.()
}

function useSlideChange(index: number, slide: Slide, motion: ActiveTransition) {
  const [change, setChange] = useState({ index, slide, leaving: null as Slide | null, direction: 1, count: 0 })
  if (change.index !== index) setChange({ index, slide, leaving: motion === 'none' ? null : change.slide, direction: index < change.index ? -1 : 1, count: change.count + 1 })
  else if (change.slide !== slide) setChange({ ...change, slide })
  useEffect(() => {
    if (!change.leaving) return
    const timer = setTimeout(() => setChange(c => ({ ...c, leaving: null })), TRANSITION_MS[motion])
    return () => clearTimeout(timer)
  }, [change.count, change.leaving, motion])
  return change
}
