import type { Slide } from '@/lib/deck'

export function Highlight({ text }: { text: string }) {
  return <>{text.split('==').map((part, i) => i % 2 ? <em key={i}>{part}</em> : <span key={i}>{part}</span>)}</>
}

export function SlideView({ slide, theme = 'room-dark', accent = '#d8b4fe', miniature = false }: { slide: Slide; theme?: string; accent?: string; miniature?: boolean }) {
  return <article className={`slide ${theme} kind-${slide.type} ${miniature ? 'miniature' : ''}`} style={{ '--slide-accent': accent } as React.CSSProperties}>
    <header className="slide-meta"><span>{slide.title || 'Kiosk Slides'}</span><span className="slide-label"><span className="label-dot" />{slide.label || 'One clear idea'}</span></header>
    <div className="slide-content">
      <div className="slide-message"><h2><Highlight text={slide.heading} /></h2>{slide.body && <p className="slide-body">{slide.body}</p>}</div>
      {slide.type === 'before-after' && <div className="comparison"><section><span className="widget-label">Before</span><p>{slide.values.before}</p></section><section><span className="widget-label">After</span><p>{slide.values.after}</p></section></div>}
      {slide.type === 'steps' && <ol className="slide-steps">{slide.items.map((item, i) => <li key={i}><span>{String(i + 1).padStart(2, '0')}</span>{item}</li>)}</ol>}
      {slide.type === 'flow' && <div className="slide-flow"><div className="flow-starts">{(slide.values.starts || '').replace(/^\[|\]$/g, '').split(',').map(s => <span key={s}>{s.trim()}</span>)}</div>{slide.items.map((item, i) => <div className="flow-step" key={i}><span aria-hidden="true">→</span><p>{item}</p></div>)}</div>}
      {slide.type === 'code' && <div className="code-frame"><div><span className="code-dots">● ● ●</span><span>{slide.values.language || 'Code'}</span></div><pre><code>{slide.values.code}</code></pre></div>}
      {slide.type === 'metric' && <div className="slide-metric"><strong>{slide.values.value}</strong><span>{slide.values.caption}</span></div>}
      {slide.type === 'image' && <figure className="slide-image"><img src={slide.values.src} alt={slide.values.alt} /><figcaption>{slide.values.caption}</figcaption></figure>}

    </div>
    <footer className="slide-footer"><span>{slide.footer}</span><span className="slide-brand">kiosk<span className="brand-period">.</span></span></footer>
  </article>
}
