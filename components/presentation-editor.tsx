'use client'

import { useCallback, useEffect, useState, type ReactNode, type RefObject } from 'react'
import { useTranslations } from 'next-intl'
import { BookOpen, CornerDownRight, FileText, Wand2 } from 'lucide-react'
import { parsePresentation, slideLines, type Presentation } from '@/lib/presentation'

export const LIVE_MS = 300

type LiveSource = {
  source: string
  presentation: Presentation | null
  error: string
}

export function useLiveSource(initial: string) {
  const [source, setSource] = useState(initial)
  const [parsed, setParsed] = useState(() => parse(initial, null))
  useEffect(() => {
    if (parsed.source === source) return
    const timer = setTimeout(() => setParsed(p => parse(source, p.presentation)), LIVE_MS)
    return () => clearTimeout(timer)
  }, [source, parsed.source])
  const replace = useCallback((value: string) => {
    setSource(value)
    setParsed(p => parse(value, p.presentation))
  }, [])
  const load = useCallback((value: string) => {
    const next = parse(value, null)
    setSource(value)
    setParsed(next)
    return next
  }, [])
  return { ...parsed, source, type: setSource, replace, load }
}

export function selectSlide(textarea: HTMLTextAreaElement, source: string, index: number) {
  const line = slideLines(source)[index]
  if (!line) return
  selectLine(textarea, source, line, false)
  const lines = source.split('\n')
  const separator = lines.slice(0, line - 1).findLastIndex(l => l.trim() === '---') + 1
  textarea.scrollTop = index && separator ? lineTop(textarea, lines, separator) : 0
}

export function PresentationEditor({
  name,
  source,
  error,
  textareaRef,
  onChange,
  onTidy,
  onHelp,
  onSlide,
  children,
}: {
  name: string
  source: string
  error: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
  onTidy: () => void
  onHelp: () => void
  onSlide: (index: number) => void
  children?: ReactNode
}) {
  const t = useTranslations('Workspace.editor')
  const line = errorLine(error)
  const follow = (target: HTMLTextAreaElement) => {
    const caret = target.value.slice(0, target.selectionStart).split('\n').length
    const index = slideLines(target.value).findLastIndex(start => start <= caret)
    onSlide(Math.max(0, index))
  }
  return (
    <div className="source-layout">
      <div className={`source-editor ${error ? 'has-error' : ''}`}>
        <div className="source-header">
          <span>
            <FileText size={14} />
            {name}
          </span>
          <div>
            <button className="btn" onClick={onHelp}>
              <BookOpen size={14} />
              {t('help')}
            </button>
            <button
              className="btn primary"
              title={t('tidyHint')}
              onClick={onTidy}
              disabled={!!error}
            >
              <Wand2 size={14} />
              {t('tidy')}
            </button>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          aria-label={t('label')}
          aria-invalid={!!error}
          value={source}
          onChange={e => onChange(e.target.value)}
          onSelect={e => follow(e.currentTarget)}
          onKeyDown={e => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
              e.preventDefault()
              if (!error) onTidy()
            }
          }}
          spellCheck={false}
        />
        <div className={`source-status ${error ? 'error' : ''}`} role="status">
          <span>{error || t('status')}</span>
          {line > 0 && (
            <button
              className="go-to-line"
              onClick={() => textareaRef.current && selectLine(textareaRef.current, source, line)}
            >
              <CornerDownRight size={13} />
              {t('goToLine')}
            </button>
          )}
        </div>
      </div>
      {children && <div className="source-preview">{children}</div>}
    </div>
  )
}

function parse(source: string, previous: Presentation | null): LiveSource {
  try {
    return { source, presentation: parsePresentation(source), error: '' }
  } catch (err) {
    return { source, presentation: previous, error: (err as Error).message }
  }
}

function errorLine(error: string) {
  return Number(error.match(/^Line (\d+):/)?.[1] ?? 0)
}

function selectLine(textarea: HTMLTextAreaElement, source: string, line: number, whole = true) {
  const lines = source.split('\n')
  const start = lines.slice(0, line - 1).reduce((sum, l) => sum + l.length + 1, 0)
  const end = whole ? start + (lines[line - 1]?.length ?? 0) : start
  textarea.focus()
  textarea.setSelectionRange(start, end)
  const height = parseFloat(getComputedStyle(textarea).lineHeight) || 20
  textarea.scrollTop = Math.max(0, (line - 1) * height - textarea.clientHeight / 3)
}

function lineTop(textarea: HTMLTextAreaElement, lines: string[], line: number) {
  const style = getComputedStyle(textarea)
  const mirror = document.createElement('div')
  Object.assign(mirror.style, {
    position: 'absolute',
    visibility: 'hidden',
    top: '0',
    left: '0',
    width: `${textarea.clientWidth}px`,
    boxSizing: 'border-box',
    padding: `0 ${style.paddingRight} 0 ${style.paddingLeft}`,
    font: style.font,
    letterSpacing: style.letterSpacing,
    tabSize: style.tabSize,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  })
  const marker = document.createElement('span')
  marker.textContent = '-'
  mirror.append(lines.slice(0, line - 1).join('\n') + (line > 1 ? '\n' : ''), marker)
  document.body.append(mirror)
  const top = marker.offsetTop
  mirror.remove()
  return top
}
