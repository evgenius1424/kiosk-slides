import { Fragment, type ComponentType, type ReactNode } from 'react'
import {
  defaultLook,
  findFont,
  headingSize,
  tableSize,
  textFit,
  DEFAULT_BRAND,
  type PresentationLook,
  type HeadingPart,
  type Slide,
} from '@/lib/presentation'
import { Inline } from './inline'
import { Punctuated } from './punctuated'
import { widgets } from './widgets'

export function HeadingText({ parts }: { parts: HeadingPart[] }) {
  return (
    <>
      {parts.map((part, i) => {
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
  const size = headingSize(slide, look)
  const table = tableSize(slide, look)
  const fit = textFit(slide, look)
  const style = {
    '--slide-tone': accent,
    '--slide-font': findFont(look.font).stack,
    ...(size && { '--heading-size': `${size}cqw` }),
    ...(table && { '--table-size': `${table}cqw` }),
    ...(fit && { '--text-fit': fit }),
  } as React.CSSProperties
  return (
    <article
      className={`slide ${theme} kind-${slide.kind} scale-${look.scale} ${miniature ? 'miniature' : ''}`}
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
