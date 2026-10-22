import type { SlideOfKind } from '@/lib/presentation'
import { Inline } from './inline'

export function QuoteView({ slide }: { slide: SlideOfKind<'quote'> }) {
  return (
    <figure className="slide-quote">
      <blockquote>
        <Inline text={slide.text} />
      </blockquote>
      {slide.by && <figcaption>{slide.by}</figcaption>}
    </figure>
  )
}
