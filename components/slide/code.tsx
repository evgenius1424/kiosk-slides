import type { SlideOfKind } from '@/lib/deck'

export function CodeWidget({ slide }: { slide: SlideOfKind<'code'> }) {
  return <div className="code-frame"><div><span className="code-dots">● ● ●</span><span>{slide.language || 'Code'}</span></div><pre><code>{slide.code}</code></pre></div>
}
