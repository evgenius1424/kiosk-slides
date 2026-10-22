import type { SlideOfKind } from '@/lib/presentation'
import { Inline } from './inline'

export function TableView({ slide }: { slide: SlideOfKind<'table'> }) {
  return (
    <table className="slide-table">
      <thead>
        <tr>
          {slide.header.map((cell, i) => (
            <th key={i}>
              <Inline text={cell} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {slide.rows.map((row, r) => (
          <tr key={r}>
            {slide.header.map((_, c) => (
              <td key={c}>
                <Inline text={row[c] ?? ''} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
