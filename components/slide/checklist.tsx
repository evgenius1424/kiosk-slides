import type { SlideOfKind, SlideWords } from '@/lib/presentation'
import { Inline } from './inline'

export function ChecklistView({
  slide,
  words,
}: {
  slide: SlideOfKind<'checklist'>
  words: SlideWords
}) {
  return (
    <ul className="slide-checklist">
      {slide.items.map((item, i) => (
        <li key={i} className={item.done ? 'done' : undefined}>
          <span aria-label={item.done ? words.done : words.toDo}>{item.done ? '✓' : ''}</span>
          <div>
            <Inline text={item.text} />
          </div>
        </li>
      ))}
    </ul>
  )
}
