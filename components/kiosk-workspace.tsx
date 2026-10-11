'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Code2,
  Copy,
  Expand,
  Keyboard,
  Layers2,
  Monitor,
  PanelLeftClose,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Share2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import {
  DEFAULT_BRAND,
  DEFAULT_TONE,
  presentationLook,
  fonts,
  formatPresentation,
  parsePresentation,
  setFrontMatter,
  themes,
  tones,
  type Scale,
  type Slide,
  type Theme,
} from '@/lib/presentation'
import {
  DEFAULT_TRANSITION,
  IDLE_MS,
  SWIPE,
  TRANSITION_MS,
  WHEEL,
  activeTransition,
  playerAction,
  slideFromHash,
  slideHash,
  slideSeconds,
  slideTitle,
  swipeDelta,
  transitions,
  type ActiveTransition,
  type Transition,
} from '@/lib/player'
import {
  blankPresentation,
  createPresentation,
  presentationName,
  loadLibrary,
  saveLibrary,
  uniqueName,
  type Library,
} from '@/lib/presentations'
import { decodeShare, readShareHash, shareSlideHash } from '@/lib/share'
import { PresentationChat } from './presentation-chat'
import { downloadFile } from './download'
import { PresentationEditor, selectSlide, useLiveSource } from './presentation-editor'
import { PresentationMenu } from './presentation-menu'
import { SharePanel } from './share-panel'
import { SlideView } from './slide'
import { useWakeLock } from './use-wake-lock'

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
] as const
const SCALES: Scale[] = ['normal', 'large', 'kiosk']

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`toggle ${checked ? 'on' : ''}`}
      onClick={onChange}
    >
      <span />
    </button>
  )
}

export function KioskWorkspace({
  example,
  prompt,
  site,
}: {
  example: string
  prompt: string
  site: string
}) {
  const t = useTranslations('Workspace')
  const ts = useTranslations('Settings')
  const th = useTranslations('Help')
  const tk = useTranslations('Shortcuts')
  const tp = useTranslations('Presentations')
  const untitled = tp('untitled')
  const blank = useMemo(() => blankPresentation(tp('blank.heading'), tp('blank.body')), [tp])
  const [library, setLibrary] = useState<Library>(() => ({
    current: 'example',
    items: [
      {
        id: 'example',
        name: presentationName(example) || untitled,
        source: example,
        userNamed: true,
        updatedAt: 0,
      },
    ],
  }))
  const [loaded, setLoaded] = useState(false)
  const [chatKey, setChatKey] = useState(0)
  const live = useLiveSource(example)
  const { source, error } = live
  const empty = useMemo(() => ({ ...parsePresentation(blank), slides: [] }), [blank])
  const presentation = live.presentation ?? empty
  const [index, setIndex] = useState(0)
  const [tab, setTab] = useState<'preview' | 'markdown' | 'chat'>('preview')
  const [safeKey, setSafeKey] = useState<boolean | null>(null)
  const [playing, setPlaying] = useState(false)
  const [presenting, setPresenting] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [exporting, setExporting] = useState(false)
  const [sidebar, setSidebar] = useState(true)
  const [modal, setModal] = useState<'help' | 'format' | null>(null)
  const [fit, setFit] = useState(true)
  const [idle, setIdle] = useState(false)
  const [brandDraft, setBrandDraft] = useState<string | null>(null)
  const [shared, setShared] = useState<string | null>(null)
  const [broken, setBroken] = useState(false)
  const [sharing, setSharing] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const settingsRef = useRef<HTMLElement>(null)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const slides = presentation.slides
  const current = library.items.find(p => p.id === library.current) ?? library.items[0]
  const theme = presentation.theme
  const look = presentationLook(presentation)
  const setFront = (key: string, value?: string) => live.replace(setFrontMatter(source, key, value))
  const setTheme = (next: Theme) => setFront('theme', next)
  const { tone: accent, transition, duration, loop } = presentation
  const safe = safeKey ?? presentation.shareSafe
  const setTone = (color: string) =>
    setFront(
      'tone',
      color === DEFAULT_TONE ? undefined : tones.find(t => t.color === color)?.name.toLowerCase(),
    )
  const setTransition = (next: Transition) =>
    setFront('transition', next === DEFAULT_TRANSITION ? undefined : next)
  const setShareSafe = (next: boolean) => {
    setSafeKey(null)
    setFront('share-safe', next ? 'true' : undefined)
  }
  const setDuration = (seconds: number) =>
    setFront('duration', seconds === 12 ? undefined : `${seconds}s`)
  const setLoop = (next: boolean) => setFront('loop', next ? undefined : 'false')
  const at = Math.max(0, Math.min(index, slides.length - 1))
  const slide = slides[at] as Slide | undefined
  const motion = activeTransition(transition, safe)
  const change = useSlideChange(index, slide, motion)
  const slideName =
    slide && t('canvas.slide', { number: at + 1, count: slides.length, title: slideTitle(slide) })
  const notice = useCallback((message: string) => setToast(message), [])
  useWakeLock(presenting || playing)
  const toggleSafe = useCallback(() => {
    notice(t('toast.shareSafe', { on: String(!safe) }))
    setSafeKey(!safe)
  }, [safe, notice, t])
  const move = useCallback(
    (delta: number) => {
      setPlaying(false)
      setIndex(i => Math.max(0, Math.min(slides.length - 1, i + delta)))
    },
    [slides.length],
  )
  const select = (i: number) => {
    setPlaying(false)
    setIndex(i)
    if (tab === 'markdown' && textareaRef.current) selectSlide(textareaRef.current, source, i)
  }
  const focusSlide = (text: string, i: number) =>
    requestAnimationFrame(() => {
      if (textareaRef.current) selectSlide(textareaRef.current, text, i)
    })
  const present = useCallback(() => {
    setTab('preview')
    setPresenting(true)
    setPlaying(false)
    ;(document.activeElement as HTMLElement)?.blur()
    enterFullscreen()
    notice(matchMedia('(hover: none)').matches ? t('toast.swipe') : t('toast.keys'))
  }, [notice, t])
  const leave = useCallback(() => {
    setPresenting(false)
    setPlaying(false)
    if (fullscreenElement()) exitFullscreen()
  }, [])
  useEffect(() => {
    const next = loadLibrary(example, untitled)
    setLibrary(next)
    const link = readShareHash(location.hash)
    if (!link) {
      show(next.items.find(p => p.id === next.current)!.source, location.hash)
      setLoaded(true)
      return
    }
    decodeShare(link.payload)
      .then(value => {
        parsePresentation(value)
        const known = next.items.find(p => p.source === value)
        if (known) setLibrary({ ...next, current: known.id })
        else setShared(link.payload)
        show(value, link.slide)
      })
      .catch(() => setBroken(true))
      .finally(() => setLoaded(true))
  }, [example, untitled])
  useEffect(() => {
    if (!loaded || broken) return
    const hash = shared ? shareSlideHash(shared, at) : slideHash(at)
    if (location.hash !== hash) history.replaceState(null, '', hash)
  }, [at, loaded, shared, broken])
  useEffect(() => {
    const follow = () => {
      const link = readShareHash(location.hash)
      if (link && link.payload !== shared) return location.reload()
      const target = slideFromHash(link?.slide ?? location.hash, slides.length)
      if (target === undefined) return
      setPlaying(false)
      setIndex(target)
    }
    window.addEventListener('hashchange', follow)
    return () => window.removeEventListener('hashchange', follow)
  }, [slides.length, shared])
  useEffect(() => {
    if (loaded) saveLibrary(library)
  }, [library, loaded])
  useEffect(() => {
    if (shared) return
    setLibrary(l => ({
      ...l,
      items: l.items.map(p =>
        p.id === l.current && p.source !== source ? { ...p, source, updatedAt: Date.now() } : p,
      ),
    }))
  }, [source, shared])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if (modal) dialogRef.current?.showModal()
    else dialogRef.current?.close()
  }, [modal])
  useEffect(() => {
    if (!settingsOpen) return
    settingsRef.current?.querySelector<HTMLElement>('select,input,button')?.focus()
    const outside = (event: PointerEvent) => {
      const target = event.target as Element
      if (
        !settingsRef.current?.contains(target) &&
        !settingsButtonRef.current?.contains(target) &&
        !target.closest('dialog')
      )
        setSettingsOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [settingsOpen])
  useEffect(() => {
    if (!playing || !slide) return
    const timer = setTimeout(
      () => {
        if (index === slides.length - 1 && !loop) {
          setPlaying(false)
          notice(t('toast.end'))
          return
        }
        setIndex(i => (i + 1) % slides.length)
      },
      slideSeconds(slide, duration) * 1000,
    )
    return () => clearTimeout(timer)
  }, [playing, index, slides.length, loop, duration, slide, notice, t])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) return
      if (event.key === 'Escape') {
        if (settingsOpen && !modal) {
          setSettingsOpen(false)
          settingsButtonRef.current?.focus()
        }
        leave()
        setModal(null)
        return
      }
      if (
        (event.target as HTMLElement).closest('input,textarea,select,button,dialog') ||
        tab !== 'preview'
      )
        return
      const action = playerAction(event)
      if (!action) return
      event.preventDefault()
      if (action === 'next') move(1)
      if (action === 'previous') move(-1)
      if (action === 'first' || action === 'last') {
        setIndex(action === 'first' ? 0 : slides.length - 1)
        setPlaying(false)
      }
      if (action === 'autoplay') {
        setPlaying(p => !p)
        notice(t('toast.autoplay', { on: String(!playing) }))
      }
      if (action === 'fullscreen') {
        if (presenting) leave()
        else present()
      }
      if (action === 'shareSafe') toggleSafe()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    move,
    playing,
    tab,
    notice,
    slides.length,
    presenting,
    present,
    leave,
    toggleSafe,
    t,
    settingsOpen,
    modal,
  ])
  useEffect(() => {
    const target = canvasRef.current
    if (!target) return
    let total = 0
    let locked = false
    let timer: ReturnType<typeof setTimeout>
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      clearTimeout(timer)
      timer = setTimeout(() => {
        locked = false
        total = 0
      }, WHEEL.settleMs)
      if (locked) return
      total += event.deltaY * (event.deltaMode === 1 ? WHEEL.lineHeight : 1)
      if (Math.abs(total) > WHEEL.distance) {
        move(Math.sign(total))
        total = 0
        locked = true
      }
    }
    const stopSwipe = onSwipe(target, move, presenting)
    target.addEventListener('wheel', wheel, { passive: false })
    return () => {
      target.removeEventListener('wheel', wheel)
      stopSwipe()
      clearTimeout(timer)
    }
  }, [move, tab, presenting])
  useEffect(() => {
    const exited = () => {
      if (!fullscreenElement()) {
        setPresenting(false)
        setPlaying(false)
      }
    }
    document.addEventListener('fullscreenchange', exited)
    document.addEventListener('webkitfullscreenchange', exited)
    return () => {
      document.removeEventListener('fullscreenchange', exited)
      document.removeEventListener('webkitfullscreenchange', exited)
    }
  }, [])
  useEffect(() => {
    if (!presenting) return
    let timer: ReturnType<typeof setTimeout>
    const wake = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), IDLE_MS)
    }
    wake()
    window.addEventListener('pointermove', wake)
    window.addEventListener('pointerdown', wake)
    return () => {
      window.removeEventListener('pointermove', wake)
      window.removeEventListener('pointerdown', wake)
      clearTimeout(timer)
      setIdle(false)
    }
  }, [presenting])
  useEffect(() => {
    const target = canvasRef.current
    if (!target) return
    const check = () => {
      const content = target.querySelector('.slide-content')
      setFit(!content || content.scrollHeight <= content.clientHeight + 3)
    }
    const observer = new ResizeObserver(check)
    observer.observe(target)
    check()
    return () => observer.disconnect()
  }, [index, tab, presenting, slide])
  function show(value: string, hash = '') {
    const next = live.load(value)
    if (next.error) setTab('markdown')
    setIndex(next.error ? 0 : (slideFromHash(hash, next.presentation!.slides.length) ?? 0))
    setPlaying(false)
    setSafeKey(null)
  }
  const openPresentation = (id: string) => {
    const target = library.items.find(p => p.id === id)
    if (!target || id === current.id) return
    setLibrary(l => ({ ...l, current: id }))
    show(target.source)
    setChatKey(k => k + 1)
  }
  const newPresentation = () => {
    const created = createPresentation(untitled, blank, library.items)
    setLibrary(l => ({ current: created.id, items: [...l.items, created] }))
    show(blank)
    setChatKey(k => k + 1)
    setTab('markdown')
    notice(t('toast.created', { name: created.name }))
  }
  const renamePresentation = (id: string, name: string) =>
    setLibrary(l => ({
      ...l,
      items: l.items.map(p =>
        p.id === id ? { ...p, name: uniqueName(name, l.items, id), userNamed: true } : p,
      ),
    }))
  const deletePresentation = (id: string) => {
    const rest = library.items.filter(p => p.id !== id)
    if (id !== current.id) {
      setLibrary(l => ({ ...l, items: rest }))
      return
    }
    const next =
      rest.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? createPresentation(untitled, blank, [])
    setLibrary({ current: next.id, items: rest.length ? rest : [next] })
    show(next.source)
    setChatKey(k => k + 1)
  }
  const tidy = () => {
    const formatted = formatPresentation(source)
    if (formatted !== source) {
      live.replace(formatted)
      focusSlide(formatted, index)
    }
    notice(t('toast.tidied'))
  }
  const loadGenerated = (generated: string, fresh: boolean) => {
    const value = formatPresentation(generated)
    const name = presentationName(value) || untitled
    const reuse = !fresh || current.source === blank
    const target = reuse
      ? {
          ...current,
          name: current.userNamed ? current.name : uniqueName(name, library.items, current.id),
        }
      : createPresentation(name, value, library.items)
    setLibrary(l => ({
      current: target.id,
      items: reuse
        ? l.items.map(p =>
            p.id === target.id
              ? {
                  ...p,
                  name: p.userNamed ? p.name : target.name,
                  source: value,
                  updatedAt: Date.now(),
                }
              : p,
          )
        : [...l.items, target],
    }))
    const next = live.load(value)
    setIndex(0)
    notice(t('toast.loaded', { name: target.name, count: next.presentation?.slides.length ?? 0 }))
    return target.name
  }
  const keepCopy = () => {
    const known = library.items.find(p => p.source === source)
    const kept =
      known ?? createPresentation(presentationName(source) || untitled, source, library.items)
    setLibrary(l => ({ current: kept.id, items: known ? l.items : [...l.items, kept] }))
    setShared(null)
    setChatKey(k => k + 1)
    notice(t('toast.kept', { name: kept.name }))
  }
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      notice(t('toast.promptCopied'))
    } catch {
      setModal('format')
      notice(t('toast.copyFailed'))
    }
  }
  const exportHTML = async () => {
    setExporting(true)
    try {
      const { presentationHtml, fetchAsDataUrl } = await import('./slide/presentation-html')
      downloadFile(
        await presentationHtml(
          { ...presentation, title: current.name },
          {
            shareSafe: safe,
            site,
            embedImage: fetchAsDataUrl,
            embedFont: file => fetchAsDataUrl(`/fonts/${file}`),
          },
        ),
        `${fileName(current.name)}.html`,
        'text/html',
      )
      notice(t('toast.downloaded'))
    } catch (err) {
      notice((err as Error).message)
    } finally {
      setExporting(false)
    }
  }
  if (broken)
    return (
      <main className="shared-broken">
        <p role="alert">{t('shared.broken')}</p>
        <a className="btn primary" href="/">
          {t('shared.home')}
        </a>
      </main>
    )
  return (
    <main
      className={`workspace ${presenting ? 'is-presenting' : ''} ${presenting && idle ? 'is-idle' : ''} ${sidebar ? '' : 'sidebar-hidden'}`}
    >
      <header className="app-header">
        <a href="/" className="brand">
          <span className="brand-icon">
            <Layers2 size={19} strokeWidth={2.2} />
          </span>
          <span aria-hidden="true">
            Kiosk<span className="brand-light">Slides</span>
          </span>
          <span className="sr-only">{t('home')}</span>
          <span className="beta">{t('beta')}</span>
        </a>
        <div className="header-divider" />
        {shared ? (
          <div className="shared-bar">
            <span>{t('shared.label')}</span>
            <button className="btn" title={t('shared.keepHint')} onClick={keepCopy}>
              <Plus size={15} />
              {t('shared.keep')}
            </button>
            {presentation.credit && (
              <a className="shared-credit" href="/">
                {t('shared.credit')}
              </a>
            )}
          </div>
        ) : (
          <>
            <PresentationMenu
              items={library.items}
              current={current}
              onOpen={openPresentation}
              onCreate={newPresentation}
              onRename={renamePresentation}
              onDelete={deletePresentation}
            />
            <span className="local-label">
              <span />
              {t('savedHere')}
            </span>
          </>
        )}
        <div className="header-actions">
          {!shared && (
            <>
              <button
                ref={settingsButtonRef}
                className="btn"
                aria-label={t('settings')}
                aria-expanded={settingsOpen}
                aria-controls="presentation-settings"
                onClick={() => setSettingsOpen(!settingsOpen)}
              >
                <Settings2 size={16} />
                <span>{t('settings')}</span>
              </button>
              <button
                className="btn"
                aria-label={t('share')}
                title={t('shareHint')}
                onClick={() => setSharing(true)}
                disabled={!slides.length}
              >
                <Share2 size={15} />
                <span>{t('share')}</span>
              </button>
              <button
                className="btn export-btn"
                title={t('downloadHint')}
                onClick={exportHTML}
                disabled={exporting || !slides.length}
              >
                <ArrowDownToLine size={15} />
                {exporting ? t('preparing') : t('download')}
              </button>
            </>
          )}
          <button className="btn primary" onClick={present} disabled={!slides.length}>
            <Play size={14} fill="currentColor" />
            <span>{t('present')}</span>
            <kbd>F</kbd>
          </button>
        </div>
      </header>
      <aside className="slides-sidebar">
        <div className="sidebar-heading">
          <span>
            {t('sidebar.title')} <span className="count-pill">{slides.length}</span>
          </span>
          <button
            className="icon-btn"
            aria-label={t('sidebar.hide')}
            onClick={() => setSidebar(false)}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        <nav className="slide-list" aria-label={t('sidebar.list')}>
          {slides.map((item, i) => (
            <button
              className={`slide-nav ${index === i ? 'selected' : ''}`}
              key={i}
              onClick={() => select(i)}
              aria-current={index === i ? 'step' : undefined}
            >
              <span className="slide-number" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="sr-only">{t('sidebar.slide', { number: i + 1 })}</span>
              <span className="thumb-group">
                <span className="thumbnail" aria-hidden="true" inert>
                  <SlideView slide={item} theme={theme} accent={accent} look={look} miniature />
                </span>
                <span className="thumb-name">
                  {item.title || t('sidebar.untitledSlide', { number: i + 1 })}
                </span>
              </span>
            </button>
          ))}
        </nav>
        <button
          className="add-slide"
          hidden={!!shared}
          onClick={() => {
            const text = `${source.trimEnd()}\n\n---\n\n# ${t('newSlide.heading')}\n\n${t('newSlide.body')}\n`
            live.replace(text)
            setIndex(slides.length)
            setTab('markdown')
            focusSlide(text, slides.length)
            notice(t('toast.slideAdded'))
          }}
        >
          <Plus size={15} />
          {t('sidebar.add')}
        </button>
      </aside>
      <section className="editor-main">
        <div className="editor-toolbar">
          <div className="view-tabs">
            {!sidebar && (
              <button
                className="icon-btn"
                aria-label={t('sidebar.show')}
                onClick={() => setSidebar(true)}
              >
                <Layers2 size={16} />
              </button>
            )}
            <button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>
              <Monitor size={14} />
              {t('tabs.preview')}
            </button>
            {!shared && (
              <>
                <button
                  className={tab === 'markdown' ? 'active' : ''}
                  onClick={() => setTab('markdown')}
                >
                  <Code2 size={15} />
                  {t('tabs.edit')}
                </button>
                <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>
                  <Sparkles size={14} />
                  {t('tabs.ask')}
                </button>
              </>
            )}
          </div>
          <span className="ready-label">
            <CheckCheck size={14} />
            {fit ? t('fit.ready') : t('fit.check')}
          </span>
        </div>
        <div className={`editor-body ${tab !== 'preview' ? 'markdown-body' : ''}`}>
          <div className="chat-host" hidden={tab !== 'chat'}>
            <PresentationChat
              key={chatKey}
              source={source}
              onPresentation={loadGenerated}
              onOpen={() => setTab('chat')}
              onCopyPrompt={copyPrompt}
            />
          </div>
          {tab === 'chat' ? null : tab === 'preview' ? (
            <>
              <div
                ref={canvasRef}
                className={`canvas-shell slide-backdrop ${theme}`}
                data-transition={motion}
                style={
                  { '--slide-tone': accent, '--kt-dir': change.direction } as React.CSSProperties
                }
                onClick={() => setPlaying(false)}
              >
                {change.leaving && (
                  <div
                    key={`leave-${change.count}`}
                    className="canvas-slide kt-leave"
                    aria-hidden="true"
                    inert
                  >
                    <SlideView slide={change.leaving} theme={theme} accent={accent} look={look} />
                  </div>
                )}
                <div
                  key={`slide-${index}`}
                  className={`canvas-slide ${change.leaving ? 'kt-enter' : ''}`}
                  role="region"
                  aria-roledescription="slide"
                  aria-label={slideName}
                >
                  {slide ? (
                    <SlideView slide={slide} theme={theme} accent={accent} look={look} />
                  ) : (
                    <p className="canvas-empty">{t('canvas.empty')}</p>
                  )}
                </div>
              </div>
              <div className="canvas-controls">
                <span>
                  <span className="status-dot" />
                  {presenting ? t('canvas.presenting') : '16:9'}
                  <span className="control-separator">/</span>
                  {t(`themes.${theme}`)}
                </span>
                <div className="slide-pagination">
                  <button
                    className="icon-btn"
                    aria-label={t('canvas.previous')}
                    onClick={() => move(-1)}
                    disabled={index === 0}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span>
                    {String(index + 1).padStart(2, '0')}{' '}
                    <span>/ {String(slides.length).padStart(2, '0')}</span>
                  </span>
                  <button
                    className="icon-btn"
                    aria-label={t('canvas.next')}
                    onClick={() => move(1)}
                    disabled={index === slides.length - 1}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
                <button className="icon-btn" aria-label={t('canvas.enter')} onClick={present}>
                  <Expand size={16} />
                </button>
              </div>
              {presenting && (
                <button className="present-exit" aria-label={t('canvas.leave')} onClick={leave}>
                  <X size={20} />
                </button>
              )}
            </>
          ) : (
            <PresentationEditor
              name={current.name}
              source={source}
              error={error}
              textareaRef={textareaRef}
              onChange={live.type}
              onTidy={tidy}
              onHelp={() => setModal('format')}
              onSlide={setIndex}
            >
              {slide && (
                <div
                  className={`source-slide slide-backdrop ${theme}`}
                  style={{ '--slide-tone': accent } as React.CSSProperties}
                >
                  <SlideView slide={slide} theme={theme} accent={accent} look={look} />
                </div>
              )}
            </PresentationEditor>
          )}
          <div className="presenter-tip" hidden={tab !== 'preview'}>
            <Keyboard size={15} />
            <span>
              {t.rich('tip', {
                kbd: key => <kbd>{key}</kbd>,
                extra: text => <span className="tip-extra">{text}</span>,
              })}
            </span>
            <button onClick={() => setModal('help')}>
              {t('allShortcuts')} <span>↗</span>
            </button>
          </div>
        </div>
        <footer className="workspace-footer">
          <span>
            <ShieldCheck size={13} />
            {t('footer.tagline')}
          </span>
          <span>{t('footer.quiet')}</span>
        </footer>
      </section>
      <aside
        ref={settingsRef}
        id="presentation-settings"
        className="inspector"
        aria-label={ts('title')}
        hidden={!settingsOpen || !!shared}
      >
        <div className="inspector-heading">
          <Settings2 size={15} />
          <h2>{ts('title')}</h2>
        </div>
        <section className="settings-section">
          <h3>{ts('appearance')}</h3>
          <label className="field-label" htmlFor="theme">
            {ts('theme')}
          </label>
          <div className="select-wrap">
            <span className={`theme-swatch ${theme}`} />
            <select id="theme" value={theme} onChange={e => setTheme(e.target.value as Theme)}>
              {themes.map(id => (
                <option key={id} value={id}>
                  {t(`themes.${id}`)}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </div>
          <div className="setting-label">{ts('tone')}</div>
          <div className="color-options">
            {tones.map(({ name, color }) => (
              <button
                key={color}
                className={`color-choice ${accent === color ? 'chosen' : ''}`}
                style={{ background: color }}
                title={ts(`tones.${name}`)}
                aria-label={ts('toneOption', { name: ts(`tones.${name}`) })}
                aria-pressed={accent === color}
                onClick={() => setTone(color)}
              >
                {accent === color && <Check size={14} />}
              </button>
            ))}
          </div>
          <p className="setting-help">{ts('toneHelp')}</p>
          <label className="field-label" htmlFor="font">
            {ts('font')}
          </label>
          <div className="select-wrap">
            <select
              id="font"
              value={look.font}
              onChange={e =>
                setFront('font', e.target.value === fonts[0].id ? undefined : e.target.value)
              }
            >
              {fonts.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </div>
          <label className="field-label" htmlFor="scale">
            {ts('textSize')}
          </label>
          <div className="select-wrap">
            <select
              id="scale"
              value={look.scale}
              onChange={e =>
                setFront(
                  'scale',
                  e.target.value === 'normal' ? undefined : (e.target.value as Scale),
                )
              }
            >
              {SCALES.map(id => (
                <option key={id} value={id}>
                  {ts(`sizes.${id}`)}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </div>
          <div className="setting-row">
            <label htmlFor="brand">{ts('brand')}</label>
            <Toggle
              checked={!!look.brand}
              onChange={() => setFront('brand', look.brand ? 'none' : undefined)}
              label={ts('showBrand')}
            />
          </div>
          {look.brand && (
            <input
              id="brand"
              className="brand-input"
              maxLength={24}
              placeholder={DEFAULT_BRAND}
              value={brandDraft ?? (look.brand === DEFAULT_BRAND ? '' : look.brand)}
              onChange={e => {
                const text = e.target.value
                setBrandDraft(text)
                setFront('brand', text.trim() && text.trim() !== 'none' ? text.trim() : undefined)
              }}
              onBlur={() => setBrandDraft(null)}
            />
          )}
          <p className="setting-help">{ts('brandHelp')}</p>
          <div className="setting-row">
            <span>{ts('credit')}</span>
            <Toggle
              checked={presentation.credit}
              onChange={() => setFront('credit', presentation.credit ? 'false' : undefined)}
              label={ts('credit')}
            />
          </div>
          <p className="setting-help">{ts('creditHelp')}</p>
        </section>
        <section className="settings-section">
          <h3>{ts('playback')}</h3>
          <div className="setting-row">
            <span>{ts('autoplay')}</span>
            <Toggle
              checked={playing}
              onChange={() => {
                setPlaying(!playing)
                notice(t('toast.autoplay', { on: String(!playing) }))
              }}
              label={ts('autoplay')}
            />
          </div>
          <p className="setting-help">{ts('autoplayHelp')}</p>
          <div className="setting-row duration-row">
            <label htmlFor="duration">{ts('duration')}</label>
            <div className="duration-input">
              <input
                id="duration"
                type="number"
                min="2"
                max="120"
                value={duration}
                onChange={e => setDuration(Math.max(2, Math.min(120, Number(e.target.value) || 2)))}
              />
              <span>{ts('seconds')}</span>
            </div>
          </div>
          <div className="setting-row">
            <span>{ts('loop')}</span>
            <Toggle checked={loop} onChange={() => setLoop(!loop)} label={ts('loop')} />
          </div>
          <div className="mini-note">
            <RotateCcw size={12} />
            <span>{ts('startsPaused')}</span>
          </div>
        </section>
        <section className="settings-section">
          <h3>{ts('motion')}</h3>
          <label className="field-label" htmlFor="transition">
            {ts('transition')}
          </label>
          <div className="select-wrap">
            <select
              id="transition"
              value={transition}
              disabled={safe}
              onChange={e => setTransition(e.target.value as Transition)}
            >
              {transitions.map(id => (
                <option key={id} value={id}>
                  {ts(`transitions.${id}.name`)}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </div>
          <p className="setting-help">
            {safe ? ts('shareSafeActive') : ts(`transitions.${transition}.help`)}
          </p>
          <div className="setting-row safe-row">
            <span>{ts('shareSafe')}</span>
            <Toggle checked={safe} onChange={() => setShareSafe(!safe)} label={ts('shareSafe')} />
          </div>
          <p className="setting-help">{ts('shareSafeHelp')}</p>
          <div className="performance-note">
            <ShieldCheck size={16} />
            <div>
              <strong>{ts('clarityTitle')}</strong>
              <p>{ts.rich('clarityBody', { br: () => <br /> })}</p>
            </div>
          </div>
        </section>
        <div className="build-panel">
          <div>
            <span className="status-dot" />
            <strong>{fit ? ts('status.ready') : ts('status.review')}</strong>
            <span>{ts('status.count', { count: slides.length })}</span>
          </div>
          <p>
            <Check size={12} />
            {ts('status.checked')}
          </p>
          <p>
            <Check size={12} />
            {fit ? ts('status.fits') : ts('status.overflows')}
          </p>
        </div>
        <button className="shortcuts-button" onClick={() => setModal('help')}>
          <CircleHelp size={15} />
          {ts('help')}
          <ArrowRight size={13} />
        </button>
      </aside>
      <div className="sr-only" aria-live="polite">
        {change.count ? slideName : ''}
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={15} />
          {toast}
        </div>
      )}
      <SharePanel
        open={sharing}
        source={source}
        site={site}
        onClose={() => setSharing(false)}
        onCopied={() => notice(t('toast.linkCopied'))}
        onDownload={() => {
          setSharing(false)
          exportHTML()
        }}
      />
      <dialog
        ref={dialogRef}
        className={`workspace-dialog ${modal === 'format' ? 'wide' : ''}`}
        onCancel={() => setModal(null)}
        onClick={e => {
          if (e.target === e.currentTarget) setModal(null)
        }}
      >
        <div className="dialog-heading">
          <h2>{modal === 'format' ? th('title') : tk('title')}</h2>
          <button className="icon-btn" aria-label={tk('close')} onClick={() => setModal(null)}>
            <X size={18} />
          </button>
        </div>
        {modal === 'format' ? (
          <>
            <p>{th('intro')}</p>
            <div className="prompt-card">
              <div>
                <strong>{th('promptTitle')}</strong>
                <p>{th('promptBody')}</p>
              </div>
              <button className="btn primary" onClick={copyPrompt}>
                <Copy size={14} />
                {th('copyPrompt')}
              </button>
            </div>
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
              <pre>{prompt}</pre>
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
    </main>
  )
}

function fileName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'kiosk-slides'
  )
}

function onSwipe(target: HTMLElement, move: (delta: number) => void, vertical: boolean) {
  let start: { x: number; y: number } | null = null
  const down = (event: TouchEvent) => {
    start =
      event.touches.length === 1
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
        : null
  }
  const up = (event: TouchEvent) => {
    if (!start) return
    const dx = event.changedTouches[0].clientX - start.x
    const dy = event.changedTouches[0].clientY - start.y
    start = null
    const distance = swipeDelta(dx, dy, vertical)
    if (Math.abs(distance) > SWIPE.distance) move(distance < 0 ? 1 : -1)
  }
  target.addEventListener('touchstart', down, { passive: true })
  target.addEventListener('touchend', up)
  return () => {
    target.removeEventListener('touchstart', down)
    target.removeEventListener('touchend', up)
  }
}

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element
  webkitExitFullscreen?: () => void
}
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

function useSlideChange(index: number, slide: Slide | undefined, motion: ActiveTransition) {
  const [change, setChange] = useState({
    index,
    slide,
    leaving: null as Slide | null,
    direction: 1,
    count: 0,
  })
  if (change.index !== index)
    setChange({
      index,
      slide,
      leaving: motion === 'none' ? null : (change.slide ?? null),
      direction: index < change.index ? -1 : 1,
      count: change.count + 1,
    })
  else if (change.slide !== slide) setChange({ ...change, slide })
  useEffect(() => {
    if (!change.leaving) return
    const timer = setTimeout(() => setChange(c => ({ ...c, leaving: null })), TRANSITION_MS[motion])
    return () => clearTimeout(timer)
  }, [change.count, change.leaving, motion])
  return change
}
