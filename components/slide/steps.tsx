import type { SlideOfKind } from '@/lib/presentation'
import { Inline } from './inline'

export function StepsView({ slide }: { slide: SlideOfKind<'steps'> }) {
  return (
    <ol className="slide-steps">
      {slide.steps.map((step, i) => (
        <li key={i}>
          <span>{String(i + 1).padStart(2, '0')}</span>
          <div>
            <Inline text={step} />
          </div>
        </li>
      ))}
    </ol>
  )
}
