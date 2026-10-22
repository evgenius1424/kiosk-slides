import type { SlideOfKind } from '@/lib/presentation'
import { Inline } from './inline'

export function BeforeAfterView({ slide }: { slide: SlideOfKind<'before-after'> }) {
  return (
    <div className="comparison">
      <section>
        <span className="widget-label">Before</span>
        <p>
          <Inline text={slide.before} />
        </p>
      </section>
      <section className="comparison-after">
        <span className="widget-label">After</span>
        <p>
          <Inline text={slide.after} />
        </p>
      </section>
    </div>
  )
}
