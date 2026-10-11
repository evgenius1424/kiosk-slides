import type { ComponentType } from 'react'
import type { Slide } from '@/lib/deck'
import { widgets } from './widgets'

export function Highlight({ text }: { text: string }) {
  return <>{text.split('==').map((part, i) => i % 2 ? <em key={i}>{part}</em> : <span key={i}>{part}</span>)}</>
}

export function SlideView({ slide, theme = 'room-dark', accent = '#74747e', miniature = false }: { slide: Slide; theme?: string; accent?: string; miniature?: boolean }) {
  // `widgets` pairs each kind with its own component, so this lookup always matches `slide`.
  const Widget = widgets[slide.kind] as ComponentType<{ slide: Slide }> | null
  return <article className={`slide ${theme} kind-${slide.kind} ${miniature ? 'miniature' : ''}`} style={{ '--slide-tone': accent } as React.CSSProperties}>
    <header className="slide-meta"><span>{slide.title || 'Kiosk Slides'}</span><span className="slide-label"><span className="label-dot" />{slide.label || 'One clear idea'}</span></header>
    <div className="slide-content">
      <div className="slide-message"><h2><Highlight text={slide.heading} /></h2>{slide.body && <p className="slide-body">{slide.body}</p>}</div>
      {Widget && <Widget slide={slide} />}
    </div>
    <footer className="slide-footer"><span>{slide.footer}</span><span className="slide-brand">kiosk<span className="brand-period">.</span></span></footer>
  </article>
}
