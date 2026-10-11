import type { SlideOfKind } from '@/lib/deck'

export function BeforeAfterView({ slide }: { slide: SlideOfKind<'before-after'> }) {
  return <div className="comparison">
    <section><span className="widget-label">Before</span><p>{slide.before}</p></section>
    <section className="comparison-after"><span className="widget-label">After</span><p>{slide.after}</p></section>
  </div>
}
