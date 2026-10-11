import type { SlideOfKind } from '@/lib/presentation'

export function TableView({ slide }: { slide: SlideOfKind<'table'> }) {
  return (
    <table className="slide-table">
      <thead>
        <tr>
          {slide.header.map((cell, i) => (
            <th key={i}>{cell}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {slide.rows.map((row, r) => (
          <tr key={r}>
            {slide.header.map((_, c) => (
              <td key={c}>{row[c] ?? ''}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
