'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import { Keyboard, ShieldCheck } from 'lucide-react'
import {
  formatPresentation,
  insertSlide,
  parsePresentation,
  presentationLook,
  removeSlide,
  slideLines,
} from '@/lib/presentation'
import { slideFromHash, type PlayerAction } from '@/lib/player'
import { blankPresentation } from '@/lib/presentations'
import { requestPrompt } from '@/lib/talk'
import { PresentationChat } from '../presentation-chat'
import { PresentationEditor, selectSlide, useLiveSource } from '../presentation-editor'
import { SharePanel } from '../share-panel'
import { SkillPanel } from '../skill-panel'
import {
  SlideActionBar,
  SlideActionMenu,
  SlidePasteDialog,
  useSlideActions,
  type SlideChange,
} from '../slide-actions'
import { SlideView } from '../slide'
import { StartScreen } from '../start-screen'
import { HelpDialog, type HelpTopic } from './help-dialog'
import { SettingsPanel, useSettingsPanel } from './settings-panel'
import { SlideCanvas, useCanvas } from './slide-canvas'
import { SlideSidebar, type SlideMenuAt } from './slide-sidebar'
import { Toast, useToast } from './toast'
import { useDownload } from './use-download'
import { useLibrary, usePasteAnywhere } from './use-library'
import { usePlayer, useSlideHash } from './use-player'
import { useShortcuts } from './use-shortcuts'
import { useVersions } from './use-versions'
import { EditorToolbar, WorkspaceHeader, type Tab } from './workspace-header'

export function KioskWorkspace({
  example,
  prompt,
  slidePrompt,
  site,
  skillInstall = false,
  slideAi = false,
  freeDraft = false,
}: {
  example: string
  prompt: string
  slidePrompt: string
  site: string
  skillInstall?: boolean
  slideAi?: boolean
  freeDraft?: boolean
}) {
  const t = useTranslations('Workspace')
  const ta = useTranslations('SlideActions')
  const tp = useTranslations('Presentations')
  const untitled = tp('untitled')
  const blank = useMemo(() => blankPresentation(tp('blank.heading'), tp('blank.body')), [tp])
  const live = useLiveSource(example)
  const { source, error } = live
  const empty = useMemo(() => ({ ...parsePresentation(blank), slides: [] }), [blank])
  const presentation = live.presentation ?? empty
  const { slides, theme, tone: accent } = presentation
  const look = presentationLook(presentation)
  const [tab, setTab] = useState<Tab>('preview')
  const [sidebar, setSidebar] = useState(true)
  const [modal, setModal] = useState<HelpTopic | null>(null)
  const [sharing, setSharing] = useState(false)
  const [addingSkill, setAddingSkill] = useState(false)
  const [start, setStart] = useState<'first' | 'new' | null>(null)
  const [request, setRequest] = useState<string>()
  const [chatKey, setChatKey] = useState(0)
  const [slideMenu, setSlideMenu] = useState<SlideMenuAt | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sourceRef = useRef(source)
  const { toast, notice, dismiss } = useToast()
  const versions = useVersions()
  const player = usePlayer(presentation, notice)
  const { index, at, slide, go, setIndex } = player
  const settings = useSettingsPanel()
  const canvas = useCanvas({ player, preview: tab === 'preview' })
  const restartChat = () => setChatKey(k => k + 1)
  const library = useLibrary({
    example,
    blank,
    untitled,
    source,
    versions,
    show,
    restartChat,
    onStart: setStart,
    notice,
  })
  const { current, shared } = library
  const download = useDownload({
    presentation,
    name: current.name,
    shareSafe: player.safe,
    site,
    notice,
  })
  const closeSlideMenu = useCallback(() => setSlideMenu(null), [])
  const undo = () => {
    const previous = versions.undo(current.id, source)
    if (previous === null) return notice(t('toast.nothingToUndo'))
    live.replace(previous)
    setIndex(i => Math.min(i, Math.max(0, slideLines(previous).length - 1)))
    notice(t('toast.undone'))
  }
  const undoAction = { label: t('toast.undo'), run: () => undoRef.current() }
  const undoRef = useRef(undo)
  const changeSlide = ({ source: next, index: at, count }: SlideChange) => {
    versions.remember(current.id, sourceRef.current)
    live.replace(next)
    go(at)
    notice(t('toast.changed', { number: at + 1, count }), undoAction)
  }
  const slideActions = useSlideActions({
    prompt: slidePrompt,
    sourceRef,
    onChange: change => changeRef.current(change),
    onNotice: notice,
  })
  const changeRef = useRef(changeSlide)
  const addSlide = (after: number) => {
    const added = Math.min(after, slideLines(source).length - 1) + 1
    const next = insertSlide(source, after, newSlide(t))
    versions.remember(current.id, source)
    live.replace(next)
    go(added)
    setTab('markdown')
    focusSlide(next, added)
    notice(t('toast.slideAdded', { number: added + 1 }), undoAction)
  }
  const deleteSlide = (i: number) => {
    if (slides.length < 2) return notice(t('toast.lastSlide'))
    versions.remember(current.id, source)
    live.replace(removeSlide(source, i))
    const next = Math.min(i, slides.length - 2)
    go(next)
    notice(t('toast.slideDeleted', { number: i + 1 }), undoAction)
    if (document.activeElement?.closest('.slide-list'))
      requestAnimationFrame(() =>
        document.querySelectorAll<HTMLElement>('.slide-nav')[next]?.focus({ preventScroll: true }),
      )
  }
  const select = (i: number) => {
    go(i)
    if (tab === 'markdown' && textareaRef.current)
      selectSlide(textareaRef.current, source, i, false)
  }
  const focusSlide = (text: string, i: number) =>
    requestAnimationFrame(() => {
      if (textareaRef.current) selectSlide(textareaRef.current, text, i)
    })
  const present = () => {
    setTab('preview')
    player.present()
  }
  const tidy = () => {
    const formatted = formatPresentation(source)
    if (formatted !== source) {
      live.replace(formatted)
      focusSlide(formatted, index)
    }
    notice(t('toast.tidied'))
  }
  const startBlank = () => {
    setStart(null)
    const created = library.addBlank()
    restartChat()
    setTab('markdown')
    notice(t('toast.created', { name: created.name }))
  }
  const makeSlides = (text: string) => {
    setStart(null)
    library.addBlank()
    restartChat()
    setRequest(text)
    setTab('chat')
  }
  const openExample = () => {
    setStart(null)
    setTab('preview')
    library.openExample()
  }
  const openDraft = (value: string) => {
    setStart(null)
    setTab('preview')
    loadGenerated(value, true)
  }
  const pastePresentation = (value: string) => {
    setStart(null)
    setTab('preview')
    library.paste(value)
  }
  const loadGenerated = (generated: string, fresh: boolean) => {
    const { name, reuse, value } = library.generated(
      formatPresentation(generated),
      fresh,
      sourceRef.current,
    )
    const next = live.load(value)
    setIndex(0)
    notice(
      t('toast.loaded', { name, count: next.presentation?.slides.length ?? 0 }),
      reuse ? undoAction : undefined,
    )
    return name
  }
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(requestPrompt(prompt))
      notice(t('toast.promptCopied'))
    } catch {
      setModal('format')
      notice(t('toast.copyFailed'))
    }
  }
  const addSkill = () => {
    setModal(null)
    setAddingSkill(true)
  }
  const playerKey = (action: PlayerAction) => {
    if (action === 'next') player.move(1)
    if (action === 'previous') player.move(-1)
    if (action === 'first') go(0)
    if (action === 'last') go(slides.length - 1)
    if (action === 'autoplay') player.toggleAutoplay()
    if (action === 'fullscreen') {
      if (player.presenting) player.leave()
      else present()
    }
    if (action === 'shareSafe') player.toggleSafe()
  }
  useEffect(() => {
    sourceRef.current = source
    undoRef.current = undo
    changeRef.current = changeSlide
  })
  useSlideHash({
    at,
    count: slides.length,
    ready: library.loaded && !library.broken,
    shared,
    go,
  })
  usePasteAnywhere(pastePresentation)
  useShortcuts({
    enabled: !start,
    preview: tab === 'preview',
    onEscape: () => {
      if (settings.open && !modal) settings.close()
      player.leave()
      setModal(null)
    },
    onUndo: () => {
      if (!shared) undoRef.current()
    },
    onPlayer: playerKey,
  })
  function show(value: string, hash = '') {
    const next = live.load(value)
    if (next.error) setTab('markdown')
    player.jump(next.error ? 0 : (slideFromHash(hash, next.presentation!.slides.length) ?? 0))
    player.resetSafe()
  }
  if (library.broken)
    return (
      <main className="shared-broken">
        <p role="alert">{t('shared.broken')}</p>
        <a className="btn primary" href="/">
          {t('shared.home')}
        </a>
      </main>
    )
  return (
    <>
      <main
        inert={!!start}
        className={`workspace ${library.loaded ? '' : 'is-loading'} ${player.presenting ? 'is-presenting' : ''} ${player.presenting && player.idle ? 'is-idle' : ''} ${sidebar ? '' : 'sidebar-hidden'}`}
      >
        <WorkspaceHeader
          library={library}
          settingsRef={settings.buttonRef}
          settingsOpen={settings.open}
          onSettings={settings.toggle}
          credit={presentation.credit}
          hasSlides={slides.length > 0}
          downloading={download.busy}
          onCreate={() => setStart('new')}
          onShare={() => setSharing(true)}
          onDownload={download.download}
          onPresent={present}
        />
        <SlideSidebar
          presentation={presentation}
          look={look}
          index={index}
          changing={slideActions.working?.index}
          editable={!shared && !error}
          readOnly={!!shared}
          onSelect={select}
          onDelete={deleteSlide}
          onMenu={setSlideMenu}
          onAdd={() => addSlide(error ? Infinity : at)}
          onHide={() => setSidebar(false)}
        />
        <section className="editor-main">
          <EditorToolbar
            tab={tab}
            readOnly={!!shared}
            sidebar={sidebar}
            fit={canvas.fit}
            onTab={setTab}
            onShowSidebar={() => setSidebar(true)}
          />
          <div className={`editor-body ${tab !== 'preview' ? 'markdown-body' : ''}`}>
            <div className="chat-host" hidden={tab !== 'chat'}>
              <PresentationChat
                key={chatKey}
                source={source}
                onPresentation={loadGenerated}
                onOpen={() => setTab('chat')}
                onCopyPrompt={copyPrompt}
                onAddSkill={skillInstall ? addSkill : undefined}
                request={request}
                onRequestTaken={() => setRequest(undefined)}
              />
            </div>
            {tab === 'chat' ? null : tab === 'preview' ? (
              <SlideCanvas
                canvasRef={canvas.ref}
                player={player}
                presentation={presentation}
                look={look}
                working={slideActions.working?.index === at}
                actions={
                  slideAi &&
                  !shared &&
                  slide && (
                    <SlideActionBar
                      disabled={!!error}
                      working={!!slideActions.working}
                      onAction={action => slideActions.run(action, at)}
                    />
                  )
                }
                onPresent={present}
              />
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
                    style={{ '--slide-tone': accent } as CSSProperties}
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
        <SettingsPanel
          panelRef={settings.panelRef}
          hidden={!settings.open || !!shared}
          source={source}
          presentation={presentation}
          look={look}
          player={player}
          fit={canvas.fit}
          onChange={live.replace}
          onHelp={() => setModal('help')}
        />
        <div className="sr-only" aria-live="polite">
          {player.change.count ? player.slideName : ''}
        </div>
        <Toast toast={toast} onDismiss={dismiss} />
        {slideMenu && (
          <SlideActionMenu
            at={slideMenu}
            onAction={
              slideAi
                ? (action, i) => {
                    if (slideActions.working) return
                    setIndex(i)
                    slideActions.run(action, i)
                  }
                : undefined
            }
            onAdd={addSlide}
            onDelete={slides.length > 1 ? deleteSlide : undefined}
            onClose={closeSlideMenu}
          />
        )}
        <SlidePasteDialog
          prompt={slideActions.pasting?.prompt ?? null}
          onPaste={slideActions.paste}
          onCopied={() => notice(ta('copied'))}
          onClose={slideActions.cancel}
        />
        <SharePanel
          open={sharing}
          source={source}
          site={site}
          onClose={() => setSharing(false)}
          onCopied={() => notice(t('toast.linkCopied'))}
          onDownload={() => {
            setSharing(false)
            download.download('html')
          }}
        />
        {skillInstall && <SkillPanel open={addingSkill} onClose={() => setAddingSkill(false)} />}
        <HelpDialog
          topic={modal}
          prompt={prompt}
          onClose={() => setModal(null)}
          onCopyPrompt={copyPrompt}
          onAddSkill={skillInstall ? addSkill : undefined}
        />
      </main>
      {start && (
        <StartScreen
          prompt={prompt}
          example={example}
          freeDraft={freeDraft}
          onMake={makeSlides}
          onDraft={openDraft}
          onExample={openExample}
          onBlank={startBlank}
          onClose={start === 'new' ? () => setStart(null) : undefined}
        />
      )}
    </>
  )
}

function newSlide(t: ReturnType<typeof useTranslations<'Workspace'>>) {
  return [
    '<!--',
    `title: ${t('newSlide.title')}`,
    `label: ${t('newSlide.label')}`,
    `footer: ${t('newSlide.footer')}`,
    '-->',
    '',
    `# ${t('newSlide.heading')}`,
    '',
    t('newSlide.body'),
  ].join('\n')
}
