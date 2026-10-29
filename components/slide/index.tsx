import { Fragment, type ComponentType, type ReactNode } from 'react'
import {
  defaultLook,
  findFont,
  headingSize,
  headingText,
  pillEdges,
  pillThemes,
  tallPill,
  tableSize,
  textFit,
  toneInk,
  DEFAULT_BRAND,
  type PresentationLook,
  type HeadingPart,
  type Slide,
  type Theme,
} from '@/lib/presentation'
import { Inline } from './inline'
import { Punctuated } from './punctuated'
import { widgets } from './widgets'

export function HeadingText({ parts, pill }: { parts: HeadingPart[]; pill?: string }) {
  if (pill) parts = pillParts(parts)
  return (
    <>
      {parts.map((part, i) => {
        if (pill && nextToHighlight(part, parts[i - 1], parts[i + 1]))
          return <Fragment key={i}>{spaced(part, parts[i - 1], parts[i + 1])}</Fragment>
        let node: ReactNode = part.code ? (
          <code>{part.text}</code>
        ) : pill && part.highlight ? (
          <PillWords text={part.text} font={pill} italic={part.italic} />
        ) : (
          <Punctuated text={part.text} />
        )
        if (part.italic) node = <em>{node}</em>
        if (part.highlight) node = <strong>{pill ? <span>{node}</span> : node}</strong>
        if (part.url)
          node = (
            <a href={part.url} target="_blank" rel="noopener noreferrer">
              {node}
            </a>
          )
        return <Fragment key={i}>{node}</Fragment>
      })}
    </>
  )
}

export function SlideView({
  slide,
  theme = 'room-dark',
  accent = '#ffffff',
  look = defaultLook(),
  miniature = false,
}: {
  slide: Slide
  theme?: string
  accent?: string
  look?: PresentationLook
  miniature?: boolean
}) {
  // `widgets` pairs each kind with its own component, so this lookup always matches `slide`.
  const Widget = widgets[slide.kind] as ComponentType<{ slide: Slide }> | null
  const pill = pillThemes.includes(theme as Theme)
  const sizing = { ...look, pill }
  const size = headingSize(slide, sizing)
  const table = tableSize(slide, sizing)
  const fit = textFit(slide, sizing)
  const font = findFont(look.font)
  const style = {
    '--slide-tone': accent,
    '--slide-ink': toneInk(accent),
    '--slide-font': font.stack,
    ...(size && { '--heading-size': `${size}cqw` }),
    ...(table && { '--table-size': `${table}cqw` }),
    ...(fit && { '--text-fit': fit }),
  } as React.CSSProperties
  return (
    <article
      className={`slide ${theme} font-${font.id} kind-${slide.kind} scale-${look.scale} ${size ? 'heading-fit' : ''} ${pill && tallPill(headingText(slide.heading.filter(part => part.highlight))) ? 'pill-tall' : ''} ${miniature ? 'miniature' : ''}`}
      style={style}
    >
      <header className="slide-meta">
        <span>{slide.title || (look.brand === DEFAULT_BRAND ? 'Kiosk Slides' : look.brand)}</span>
        <span className="slide-label">
          <span className="label-dot" />
          {slide.label || 'One clear idea'}
        </span>
      </header>
      <div className="slide-content">
        <div className="slide-message">
          <h2>
            <HeadingText parts={slide.heading} pill={pill ? look.font : undefined} />
          </h2>
          {slide.body && (
            <p className="slide-body">
              <Inline text={slide.body} />
            </p>
          )}
        </div>
        {Widget && <Widget slide={slide} />}
      </div>
      <footer className="slide-footer">
        <span>{slide.footer}</span>
        {look.brand && (
          <span className={`slide-brand ${look.brand === DEFAULT_BRAND ? '' : 'custom'}`}>
            {look.brand === DEFAULT_BRAND ? (
              <>
                kiosk<span className="brand-period">.</span>
              </>
            ) : (
              look.brand
            )}
          </span>
        )}
      </footer>
    </article>
  )
}

function PillWords({ text, font, italic }: { text: string; font: string; italic?: boolean }) {
  const tokens = text.split(/(\s+)/)
  const edges = tokens.map((token, i) => (i % 2 ? undefined : pillEdges(token, font, italic)))
  return tokens.map((token, i) => {
    if (i % 2) {
      const gap = -(edges[i - 1]?.end ?? 0) - (edges[i + 1]?.start ?? 0)
      return (
        <span key={i} style={{ wordSpacing: `${Math.round(gap * 1000) / 1000}em` }}>
          {token}
        </span>
      )
    }
    if (!token) return null
    const { start, end } = edges[i]!
    return (
      <span key={i} style={{ marginLeft: `${start}em`, marginRight: `${end}em` }}>
        <Punctuated text={token} />
      </span>
    )
  })
}

function pillParts(parts: HeadingPart[]) {
  const pieces = parts.map(part => ({ ...part }))
  pieces.forEach((part, i) => {
    if (!part.highlight) return
    const before = pieces[i - 1]
    const after = pieces[i + 1]
    if (plain(before)) {
      const [, rest, word] = /^([\s\S]*?)(\S*)$/.exec(before.text)!
      before.text = rest
      part.text = word + part.text
    }
    if (plain(after)) {
      const [, word, rest] = /^(\S*)([\s\S]*)$/.exec(after.text)!
      after.text = rest
      part.text += word
    }
  })
  return pieces.filter(part => part.text)
}

function plain(part?: HeadingPart): part is HeadingPart {
  return !!part && !part.highlight && !part.code && !part.url && !part.italic
}

function nextToHighlight(part: HeadingPart, before?: HeadingPart, after?: HeadingPart) {
  return plain(part) && !!(before?.highlight || after?.highlight)
}

function spaced(part: HeadingPart, before?: HeadingPart, after?: HeadingPart) {
  const [, lead, text, trail] = /^(\s?)([\s\S]*?)(\s?)$/.exec(part.text)!
  return (
    <>
      {before?.highlight && lead === ' ' ? <span className="pill-gap"> </span> : lead}
      <Punctuated text={text} />
      {after?.highlight && trail === ' ' ? <span className="pill-gap"> </span> : trail}
    </>
  )
}
