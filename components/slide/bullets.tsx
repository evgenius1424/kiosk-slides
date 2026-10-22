import type { SlideOfKind } from '@/lib/presentation'
import { Inline } from './inline'

export function BulletsView({ slide }: { slide: SlideOfKind<'bullets'> }) {
  return (
    <ul className="slide-bullets">
      {slide.items.map((item, i) => (
        <li key={i}>
          <div>
            <Inline text={item} />
          </div>
        </li>
      ))}
    </ul>
  )
}
