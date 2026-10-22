import type { SlideOfKind, SlideWords } from '@/lib/presentation'
import { Inline } from './inline'

export function BeforeAfterView({
  slide,
  words,
}: {
  slide: SlideOfKind<'before-after'>
  words: SlideWords
}) {
  return (
    <div className="comparison">
      <section>
        <span className="widget-label">{words.before}</span>
        <p>
          <Inline text={slide.before} />
        </p>
      </section>
      <section className="comparison-after">
        <span className="widget-label">{words.after}</span>
        <p>
          <Inline text={slide.after} />
        </p>
      </section>
    </div>
  )
}
