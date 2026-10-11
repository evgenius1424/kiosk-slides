import type { SlideOfKind } from '@/lib/deck'

export function ImageWidget({ slide }: { slide: SlideOfKind<'image'> }) {
  return <figure className="slide-image"><img src={slide.src} alt={slide.alt} /><figcaption>{slide.caption}</figcaption></figure>
}
