import type { SlideOfKind } from '@/lib/presentation'

export function ButtonsView({ slide }: { slide: SlideOfKind<'buttons'> }) {
  return (
    <div className="slide-buttons">
      {slide.buttons.map((button, i) => (
        <a key={i} href={button.url} target="_blank" rel="noopener noreferrer">
          {button.label}
        </a>
      ))}
    </div>
  )
}
