import type { SlideOfKind } from '@/lib/presentation'
import { Inline } from './inline'

export function MetricView({ slide }: { slide: SlideOfKind<'metric'> }) {
  return (
    <div className="slide-metric">
      <strong>{slide.value}</strong>
      <span>
        <Inline text={slide.caption} />
      </span>
    </div>
  )
}
