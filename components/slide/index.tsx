import { Fragment, type ComponentType, type ReactNode } from 'react'
import {
  defaultLook,
  findFont,
  headingSize,
  pillThemes,
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

export function HeadingText({ parts }: { parts: HeadingPart[] }) {
  return (
    <>
      {parts.map((part, i) => {
        if (nextToHighlight(part, parts[i - 1], parts[i + 1]))
          return <Fragment key={i}>{spaced(part, parts[i - 1], parts[i + 1])}</Fragment>
        let node: ReactNode = part.code ? <code>{part.text}</code> : <Punctuated text={part.text} />
        if (part.italic) node = <em>{node}</em>
        if (part.highlight) node = <strong>{node}</strong>
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
  const sizing = { ...look, pill: pillThemes.includes(theme as Theme) }
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
      className={`slide ${theme} font-${font.id} kind-${slide.kind} scale-${look.scale} ${miniature ? 'miniature' : ''}`}
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
            <HeadingText parts={slide.heading} />
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

function nextToHighlight(part: HeadingPart, before?: HeadingPart, after?: HeadingPart) {
  return !part.highlight && !part.code && !part.url && !!(before?.highlight || after?.highlight)
}

function spaced(part: HeadingPart, before?: HeadingPart, after?: HeadingPart) {
  const [, lead, text, trail] = /^(\s?)([\s\S]*?)(\s?)$/.exec(part.text)!
  const node = <Punctuated text={text} />
  const italic = part.italic ? <em>{node}</em> : node
  return (
    <>
      {before?.highlight && lead === ' ' ? <span className="pill-gap"> </span> : lead}
      {italic}
      {after?.highlight && trail === ' ' ? <span className="pill-gap"> </span> : trail}
    </>
  )
}
