'use client'

import type { RefObject } from 'react'
import { useTranslations } from 'next-intl'
import { Code2, Layers2, Monitor, Play, Plus, Settings2, Share2, Sparkles } from 'lucide-react'
import { DownloadMenu, type DownloadFormat } from '../download-menu'
import { PresentationMenu } from '../presentation-menu'
import type { useLibrary } from './use-library'

export type Tab = 'preview' | 'markdown' | 'chat'

export function WorkspaceHeader({
  library,
  settingsRef,
  settingsOpen,
  credit,
  hasSlides,
  downloading,
  onCreate,
  onSettings,
  onShare,
  onDownload,
  onPresent,
}: {
  library: ReturnType<typeof useLibrary>
  settingsRef: RefObject<HTMLButtonElement | null>
  settingsOpen: boolean
  credit: boolean
  hasSlides: boolean
  downloading: boolean
  onCreate: () => void
  onSettings: () => void
  onShare: () => void
  onDownload: (format: DownloadFormat) => void
  onPresent: () => void
}) {
  const t = useTranslations('Workspace')
  const { shared } = library
  return (
    <header className="app-header">
      <a href="/" className="brand">
        <span className="brand-icon">
          <Layers2 size={19} strokeWidth={2.2} />
        </span>
        <span className="brand-name" aria-hidden="true">
          Kiosk<span className="brand-light">Slides</span>
        </span>
        <span className="sr-only">{t('home')}</span>
      </a>
      {shared ? (
        <div className="shared-bar">
          <span>{t('shared.label')}</span>
          <button className="btn" title={t('shared.keepHint')} onClick={library.keep}>
            <Plus size={15} />
            {t('shared.keep')}
          </button>
          {credit && (
            <a className="shared-credit" href="/">
              {t('shared.credit')}
            </a>
          )}
        </div>
      ) : (
        <PresentationMenu
          items={library.items}
          current={library.current}
          onOpen={library.open}
          onCreate={onCreate}
          onRename={library.rename}
          onDelete={library.remove}
        />
      )}
      <div className="header-actions">
        {!shared && (
          <>
            <button
              ref={settingsRef}
              className="btn"
              aria-label={t('settings')}
              aria-expanded={settingsOpen}
              aria-controls="presentation-settings"
              onClick={onSettings}
            >
              <Settings2 size={16} />
              <span>{t('settings')}</span>
            </button>
            <button
              className="btn"
              aria-label={t('share')}
              title={t('shareHint')}
              onClick={onShare}
              disabled={!hasSlides}
            >
              <Share2 size={16} />
              <span>{t('share')}</span>
            </button>
            <DownloadMenu busy={downloading} disabled={!hasSlides} onDownload={onDownload} />
          </>
        )}
        <button className="btn primary" onClick={onPresent} disabled={!hasSlides}>
          <Play size={16} fill="currentColor" />
          <span>{t('present')}</span>
          <kbd>F</kbd>
        </button>
      </div>
    </header>
  )
}

export function EditorToolbar({
  tab,
  readOnly,
  sidebar,
  onTab,
  onShowSidebar,
}: {
  tab: Tab
  readOnly: boolean
  sidebar: boolean
  onTab: (tab: Tab) => void
  onShowSidebar: () => void
}) {
  const t = useTranslations('Workspace')
  return (
    <div className="editor-toolbar">
      <div className="view-tabs">
        {!sidebar && (
          <button className="icon-btn" aria-label={t('sidebar.show')} onClick={onShowSidebar}>
            <Layers2 size={16} />
          </button>
        )}
        <button className={tab === 'preview' ? 'active' : ''} onClick={() => onTab('preview')}>
          <Monitor size={14} />
          {t('tabs.preview')}
        </button>
        {!readOnly && (
          <>
            <button
              className={tab === 'markdown' ? 'active' : ''}
              onClick={() => onTab('markdown')}
            >
              <Code2 size={15} />
              {t('tabs.edit')}
            </button>
            <button className={tab === 'chat' ? 'active' : ''} onClick={() => onTab('chat')}>
              <Sparkles size={14} />
              {t('tabs.ask')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
