import type { SlideOfKind } from '@/lib/deck'

/**
 * One row per chain, joined by short arrows. A box both chains name is repeated on each row and
 * marked as shared, so a merge or split reads without connectors stretched across empty space.
 */
export function FlowView({ slide }: { slide: SlideOfKind<'flow'> }) {
  const [first, second = []] = slide.lines
  const shared = new Set(first.filter(box => second.includes(box)))
  return (
    <div className="slide-flow">
      {slide.lines.map((line, row) => (
        <div className="flow-line" key={row}>
          {line.flatMap((box, i) => [
            i > 0 && (
              <span className="flow-arrow" aria-hidden="true" key={`${box}\u0000arrow`}>
                →
              </span>
            ),
            <p className={shared.has(box) ? 'flow-box flow-shared' : 'flow-box'} key={box}>
              {box}
            </p>,
          ])}
        </div>
      ))}
    </div>
  )
}
