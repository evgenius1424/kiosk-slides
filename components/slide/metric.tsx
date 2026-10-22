import type { SlideOfKind } from '@/lib/presentation'
import { Inline } from './inline'
import { Punctuated } from './punctuated'

export function MetricView({ slide }: { slide: SlideOfKind<'metric'> }) {
  return (
    <div className="slide-metric">
      <strong>
        <Punctuated text={slide.value} />
      </strong>
      <span>
        <Inline text={slide.caption} />
      </span>
    </div>
  )
}
