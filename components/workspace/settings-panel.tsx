'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronDown, Settings2 } from 'lucide-react'
import {
  DEFAULT_BRAND,
  DEFAULT_TRANSITION,
  transitions,
  type Transition,
  defaultFont,
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
import { isStyleKey, rememberStyle } from '@/lib/last-style'
import type { Player } from './use-player'

const GRADUAL = ['brand', 'duration']

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
  presentationId,
  presentation,
  look,
  player,
  onChange,
}: {
  panelRef: RefObject<HTMLElement | null>
  hidden: boolean
  source: string
  presentationId: string
  presentation: Presentation
  look: PresentationLook
  player: Player
  onChange: (source: string, previous?: string) => void
}) {
  const t = useTranslations('Workspace')
  const ts = useTranslations('Settings')
  const [brandDraft, setBrandDraft] = useState<string | null>(null)
  const { theme, tone: accent, transition, duration, loop, credit } = presentation
  const { safe, playing } = player
  const latest = useRef({ source, presentationId })
  const lastChange = useRef({ key: '', wrote: '' })
  useEffect(() => {
    latest.current = { source, presentationId }
  })
  const set = (key: string, value?: string, from = source) => {
    const next = setFrontMatter(from, key, value)
    const again =
      GRADUAL.includes(key) && lastChange.current.key === key && lastChange.current.wrote === from
    lastChange.current = { key, wrote: next }
    onChange(next, again ? undefined : from)
    if (isStyleKey(key)) rememberStyle(next)
  }
  const setTone = (color: string) =>
    set('tone', color === defaultTone(theme) ? undefined : toneName(color, theme))
  const setTheme = async (id: Theme) => {
    const chosenFor = presentationId
    await loadFonts()
    if (latest.current.presentationId !== chosenFor) return
    set('theme', id, latest.current.source)
  }
  const setFont = async (id: string) => {
    const chosenFor = presentationId
    await loadFonts()
    if (latest.current.presentationId !== chosenFor) return
    set('font', id === defaultFont(theme) ? undefined : id, latest.current.source)
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
        <h3>{ts('look')}</h3>
        <label className="field-label" htmlFor="theme">
          {ts('theme')}
        </label>
        <div className="select-wrap">
          <span className={`theme-swatch ${theme}`} />
          <select id="theme" value={theme} onChange={e => void setTheme(e.target.value as Theme)}>
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
          {ts('scale')}
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
      </section>
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
