'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowDownToLine, Check, Copy, ExternalLink, X } from 'lucide-react'

const REPO = 'evgenius1424/kiosk-slides'
const ZIP_URL = `https://github.com/${REPO}/releases/latest/download/kiosk-slides.zip`
const CLAUDE_SETTINGS_URL = 'https://claude.ai/settings/capabilities'
const COPIED_MS = 2000

const COMMANDS = {
  claudeCode: [`/plugin marketplace add ${REPO}`, '/plugin install kiosk-slides@kiosk-slides'],
  codex: [`codex plugin marketplace add ${REPO}`, 'codex plugin add kiosk-slides@kiosk-slides'],
  copilot: [
    `copilot plugin marketplace add ${REPO}`,
    'copilot plugin install kiosk-slides@kiosk-slides',
    `https://github.com/${REPO}`,
  ],
  gemini: [`gemini skills install https://github.com/${REPO}.git --path skills`],
  other: [`npx skills@latest add ${REPO}`],
}

const PLACES = ['claude', ...(Object.keys(COMMANDS) as (keyof typeof COMMANDS)[])] as const

type Place = (typeof PLACES)[number]

export function SkillPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('Skill')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [place, setPlace] = useState<Place>('claude')
  useEffect(() => {
    if (open) dialogRef.current?.showModal()
    else dialogRef.current?.close()
  }, [open])
  return (
    <dialog
      ref={dialogRef}
      className="workspace-dialog wide skill-dialog"
      onCancel={onClose}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="dialog-heading">
        <h2>{t('title')}</h2>
        <button className="icon-btn" aria-label={t('close')} onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <p>{t('intro')}</p>
      <div className="skill-places" role="tablist" aria-label={t('places')}>
        {PLACES.map(id => (
          <button
            key={id}
            role="tab"
            id={`skill-tab-${id}`}
            aria-selected={place === id}
            aria-controls="skill-steps"
            className={place === id ? 'active' : ''}
            onClick={() => setPlace(id)}
          >
            {t(`${id}.name`)}
          </button>
        ))}
      </div>
      <div id="skill-steps" role="tabpanel" aria-labelledby={`skill-tab-${place}`}>
        {place === 'claude' ? <ClaudeSteps /> : <CommandSteps place={place} />}
        <div className="skill-try">
          <strong>{t('tryTitle')}</strong>
          <CopyLine text={t('tryAsk')} />
        </div>
      </div>
    </dialog>
  )
}

function ClaudeSteps() {
  const t = useTranslations('Skill')
  return (
    <ol className="skill-steps">
      <li>
        <span>{t('claude.download')}</span>
        <a className="btn primary" href={ZIP_URL} download>
          <ArrowDownToLine size={15} />
          {t('claude.downloadButton')}
        </a>
      </li>
      <li>
        <span>{t('claude.settings')}</span>
        <a className="btn" href={CLAUDE_SETTINGS_URL} target="_blank" rel="noreferrer">
          <ExternalLink size={14} />
          {t('claude.settingsButton')}
        </a>
      </li>
      <li>
        <span>{t('claude.upload')}</span>
      </li>
    </ol>
  )
}

function CommandSteps({ place }: { place: keyof typeof COMMANDS }) {
  const t = useTranslations('Skill')
  return (
    <>
      <p className="skill-where">{t(`${place}.where`)}</p>
      <div className="skill-commands">
        {COMMANDS[place].map(command => (
          <CopyLine key={command} text={command} code />
        ))}
      </div>
      <p className="skill-note">{t(`${place}.note`)}</p>
    </>
  )
}

function CopyLine({ text, code }: { text: string; code?: boolean }) {
  const t = useTranslations('Skill')
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), COPIED_MS)
    return () => clearTimeout(timer)
  }, [copied])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      if (ref.current) getSelection()?.selectAllChildren(ref.current)
    }
  }
  return (
    <div className="copy-line">
      {code ? <code ref={ref}>{text}</code> : <span ref={ref}>{text}</span>}
      <button className="btn" onClick={copy} aria-label={copied ? t('copied') : t('copy')}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
        <span>{copied ? t('copied') : t('copy')}</span>
      </button>
    </div>
  )
}
