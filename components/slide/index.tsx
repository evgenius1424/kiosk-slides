import { Fragment, type ComponentType, type ReactNode } from 'react'
import type { HeadingPart, Slide } from '@/lib/deck'
import { widgets } from './widgets'

export function HeadingText({ parts }: { parts: HeadingPart[] }) {
  return <>{parts.map((part, i) => {
    let node: ReactNode = part.code ? <code>{part.text}</code> : part.text
    if (part.italic) node = <em>{node}</em>
    if (part.highlight) node = <strong>{node}</strong>
    if (part.url) node = <a href={part.url} target="_blank" rel="noopener noreferrer">{node}</a>
    return <Fragment key={i}>{node}</Fragment>
  })}</>
}

export function SlideView({ slide, theme = 'room-dark', accent = '#74747e', miniature = false }: { slide: Slide; theme?: string; accent?: string; miniature?: boolean }) {
  // `widgets` pairs each kind with its own component, so this lookup always matches `slide`.
  const Widget = widgets[slide.kind] as ComponentType<{ slide: Slide }> | null
  return <article className={`slide ${theme} kind-${slide.kind} ${miniature ? 'miniature' : ''}`} style={{ '--slide-tone': accent } as React.CSSProperties}>
    <header className="slide-meta"><span>{slide.title || 'Kiosk Slides'}</span><span className="slide-label"><span className="label-dot" />{slide.label || 'One clear idea'}</span></header>
    <div className="slide-content">
      <div className="slide-message"><h2><HeadingText parts={slide.heading} /></h2>{slide.body && <p className="slide-body">{slide.body}</p>}</div>
      {Widget && <Widget slide={slide} />}
    </div>
    <footer className="slide-footer"><span>{slide.footer}</span><span className="slide-brand">kiosk<span className="brand-period">.</span></span></footer>
  </article>
}
