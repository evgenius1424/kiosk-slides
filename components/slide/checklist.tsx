import type { SlideOfKind } from '@/lib/presentation'
import { Inline } from './inline'

export function ChecklistView({ slide }: { slide: SlideOfKind<'checklist'> }) {
  return (
    <ul className="slide-checklist">
      {slide.items.map((item, i) => (
        <li key={i} className={item.done ? 'done' : undefined}>
          <span aria-label={item.done ? 'Done' : 'To do'}>{item.done ? '✓' : ''}</span>
          <div>
            <Inline text={item.text} />
          </div>
        </li>
      ))}
    </ul>
  )
}
