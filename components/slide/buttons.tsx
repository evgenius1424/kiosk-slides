import type { SlideOfKind } from '@/lib/deck'

export function ButtonsWidget({ slide }: { slide: SlideOfKind<'buttons'> }) {
  return (
    <div className="slide-buttons">
      {slide.buttons.map((button, i) => (
        <a key={i} href={button.url} target="_blank" rel="noopener noreferrer">{button.label}</a>
      ))}
    </div>
  )
}
