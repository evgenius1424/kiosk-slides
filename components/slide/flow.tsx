import type { CSSProperties } from 'react'
import type { SlideOfKind } from '@/lib/deck'

type Rows = { start: number; end: number }

/**
 * Lay the chains out on a grid: one row per chain, one column per step.
 * A box shared by both chains appears once, spans both rows, and sits one column after
 * its furthest predecessor so both chains' arrows meet it.
 */
function layout(lines: string[][]) {
  const column = new Map<string, number>()
  const rows = new Map<string, Rows>()
  const edges = new Map<string, { from: string; to: string; rows: Rows }>()
  const span = (prev: Rows | undefined, row: number): Rows =>
    prev ? { start: Math.min(prev.start, row), end: Math.max(prev.end, row) } : { start: row, end: row }

  lines.forEach((line, row) => line.forEach((box, i) => {
    rows.set(box, span(rows.get(box), row))
    if (i > 0) {
      const key = `${line[i - 1]}\u0000${box}`
      edges.set(key, { from: line[i - 1], to: box, rows: span(edges.get(key)?.rows, row) })
    }
  }))
  // Longest path from a chain start; bounded so a loop between chains can't spin forever.
  for (const box of rows.keys()) column.set(box, 0)
  for (let pass = 0; pass < rows.size; pass++) {
    for (const { from, to } of edges.values()) column.set(to, Math.max(column.get(to)!, column.get(from)! + 1))
  }
  return { boxes: [...rows].map(([text, r]) => ({ text, rows: r, column: column.get(text)! })), edges: [...edges.values()], column }
}

const area = (rows: Rows, from: number, to: number): CSSProperties =>
  ({ gridRow: `${rows.start + 1} / ${rows.end + 2}`, gridColumn: `${from} / ${to}` })

export function FlowWidget({ slide }: { slide: SlideOfKind<'flow'> }) {
  const { boxes, edges, column } = layout(slide.lines)
  // Boxes take odd grid columns, arrows the even columns between them.
  return <div className="slide-flow">
    {boxes.map(box => <p className="flow-box" key={box.text} style={area(box.rows, box.column * 2 + 1, box.column * 2 + 2)}>{box.text}</p>)}
    {edges.map(edge => <span className="flow-arrow" aria-hidden="true" key={`${edge.from}\u0000${edge.to}`}
      style={area(edge.rows, column.get(edge.from)! * 2 + 2, column.get(edge.to)! * 2 + 1)}>→</span>)}
  </div>
}
