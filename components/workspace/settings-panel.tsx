'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  RotateCcw,
  Settings2,
  ShieldCheck,
} from 'lucide-react'
import {
  DEFAULT_BRAND,
  DEFAULT_TRANSITION,
  transitions,
  type Transition,
  defaultTone,
  fonts,
  scales,
  setFrontMatter,
  themes,
  toneName,
  tones,
  type Presentation,
  type PresentationLook,
  type Scale,
  type Theme,
} from '@/lib/presentation'
import type { Player } from './use-player'

export function useSettingsPanel() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    void loadFonts()
    panelRef.current?.querySelector<HTMLElement>('select,input,button')?.focus()
    const outside = (event: PointerEvent) => {
      const target = event.target as Element
      if (
        !panelRef.current?.contains(target) &&
        !buttonRef.current?.contains(target) &&
        !target.closest('dialog')
      )
        setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }
  return { open, panelRef, buttonRef, toggle: () => setOpen(!open), close }
}

export function SettingsPanel({
  panelRef,
  hidden,
  source,
  presentation,
  look,
  player,
  fit,
  onChange,
  onHelp,
}: {
  panelRef: RefObject<HTMLElement | null>
  hidden: boolean
  source: string
  presentation: Presentation
  look: PresentationLook
  player: Player
  fit: boolean
  onChange: (source: string) => void
  onHelp: () => void
}) {
  const t = useTranslations('Workspace')
  const ts = useTranslations('Settings')
  const [brandDraft, setBrandDraft] = useState<string | null>(null)
  const { theme, tone: accent, transition, duration, loop, credit, slides } = presentation
  const { safe, playing } = player
  const set = (key: string, value?: string) => onChange(setFrontMatter(source, key, value))
  const setTone = (color: string) =>
    set('tone', color === defaultTone(theme) ? undefined : toneName(color, theme))
  const setFont = async (id: string) => {
    await loadFonts()
    set('font', id === fonts[0].id ? undefined : id)
  }
  const setShareSafe = (next: boolean) => {
    player.resetSafe()
    set('share-safe', next ? 'true' : undefined)
  }
  return (
    <aside
      ref={panelRef}
      id="presentation-settings"
      className="inspector"
      aria-label={ts('title')}
      hidden={hidden}
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
          <select id="theme" value={theme} onChange={e => set('theme', e.target.value as Theme)}>
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
          {tones.map(({ name, colors }) => {
            const color = colors[theme]
            return (
              <button
                key={name}
                className={`color-choice ${accent === color ? 'chosen' : ''}`}
                style={{ background: color }}
                title={ts(`tones.${name}`)}
                aria-label={ts('toneOption', { name: ts(`tones.${name}`) })}
                aria-pressed={accent === color}
                onClick={() => setTone(color)}
              >
                {accent === color && <Check size={14} />}
              </button>
            )
          })}
        </div>
        <p className="setting-help">{ts('toneHelp')}</p>
        <label className="field-label" htmlFor="font">
          {ts('font')}
        </label>
        <div className="select-wrap">
          <select id="font" value={look.font} onChange={e => void setFont(e.target.value)}>
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
              set('scale', e.target.value === 'normal' ? undefined : (e.target.value as Scale))
            }
          >
            {scales.map(id => (
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
            onChange={() => set('brand', look.brand ? 'none' : undefined)}
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
              set('brand', text.trim() && text.trim() !== 'none' ? text.trim() : undefined)
            }}
            onBlur={() => setBrandDraft(null)}
          />
        )}
        <p className="setting-help">{ts('brandHelp')}</p>
        <div className="setting-row">
          <span>{ts('credit')}</span>
          <Toggle
            checked={credit}
            onChange={() => set('credit', credit ? 'false' : undefined)}
            label={ts('credit')}
          />
        </div>
        <p className="setting-help">{ts('creditHelp')}</p>
      </section>
      <section className="settings-section">
        <h3>{ts('playback')}</h3>
        <div className="setting-row">
          <span>{ts('autoplay')}</span>
          <Toggle checked={playing} onChange={player.toggleAutoplay} label={ts('autoplay')} />
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
              onChange={e => {
                const seconds = Math.max(2, Math.min(120, Number(e.target.value) || 2))
                set('duration', seconds === 12 ? undefined : `${seconds}s`)
              }}
            />
            <span>{ts('seconds')}</span>
          </div>
        </div>
        <div className="setting-row">
          <span>{ts('loop')}</span>
          <Toggle
            checked={loop}
            onChange={() => set('loop', loop ? 'false' : undefined)}
            label={ts('loop')}
          />
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
            onChange={e => {
              const next = e.target.value as Transition
              set('transition', next === DEFAULT_TRANSITION ? undefined : next)
            }}
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
      <button className="shortcuts-button" onClick={onHelp}>
        <CircleHelp size={15} />
        {ts('help')}
        <ArrowRight size={13} />
      </button>
    </aside>
  )
}

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

let fontsLoaded: Promise<unknown> | undefined

function loadFonts() {
  fontsLoaded ??= Promise.all([...document.fonts].map(face => face.load().catch(() => {})))
  return fontsLoaded
}
