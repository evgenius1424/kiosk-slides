import type { SlideOfKind } from '@/lib/presentation'

export function ImageView({ slide }: { slide: SlideOfKind<'image'> }) {
  return (
    <figure className="slide-image">
      <img src={slide.src} alt={slide.alt} />
      <figcaption>{slide.caption}</figcaption>
    </figure>
  )
}
