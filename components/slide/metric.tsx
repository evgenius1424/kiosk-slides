import type { SlideOfKind } from '@/lib/deck'

export function MetricWidget({ slide }: { slide: SlideOfKind<'metric'> }) {
  return <div className="slide-metric"><strong>{slide.value}</strong><span>{slide.caption}</span></div>
}
