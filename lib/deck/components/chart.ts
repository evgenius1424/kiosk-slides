import { tableRows } from './table'
import { defineWidget } from './types'

export type ChartType = 'bar' | 'line'
export type ChartSeries = { name: string; values: number[] }
export type ChartWidget = { kind: 'chart'; type: ChartType; labels: string[]; series: ChartSeries[] }

/** `1,450` / `12.5` / `-3` → number; anything else → NaN. */
const toNumber = (cell: string) => /^-?[\d,]*\.?\d+$/.test(cell) ? Number(cell.replace(/,/g, '')) : NaN

/** A GFM table directly under `<!-- chart: type=bar|line x=<col> y=<col> -->`. */
export const chart = defineWidget<ChartWidget>({
  kind: 'chart',
  annotation: 'chart',
  settings: ['type', 'x', 'y'],
  parse: block => {
    const { annotation, fail, line } = block
    // The annotation sits on the line directly above the block.
    const failAnnotation = (message: string) => fail(message, line - 1)
    const { type, x, y } = annotation?.args ?? {}
    if (type !== 'bar' && type !== 'line') return failAnnotation('A chart needs type=bar or type=line.')
    const [{ cells: header }, ...body] = tableRows(block) ?? fail('Put a table directly under <!-- chart -->.')
    if (!body.length) fail('Add at least one row of data under the chart’s header.')
    if (header.length > 5 || body.length > 6) fail('A chart supports at most 5 columns and 6 rows. Trim the table or split the slide.')
    const column = (name: string) => {
      const index = header.indexOf(name)
      return index >= 0 ? index : failAnnotation(`The table has no “${name}” column. Use one of: ${header.join(', ')}.`)
    }
    const xIndex = x ? column(x) : 0
    const yIndexes = y ? [column(y)] : header.map((_, i) => i).filter(i => i !== xIndex)
    if (!yIndexes.length || yIndexes.includes(xIndex)) fail('A chart needs a label column and at least one number column.')

    const labels = body.map(row => row.cells[xIndex] || fail(`Give every row a label in the ${header[xIndex]} column.`, row.line))
    const series = yIndexes.map(i => ({
      name: header[i],
      values: body.map(row => {
        const value = toNumber(row.cells[i] ?? '')
        return Number.isNaN(value) ? fail(`“${row.cells[i] ?? ''}” in the ${header[i]} column isn’t a number.`, row.line) : value
      }),
    }))
    return { kind: 'chart', type, labels, series }
  },
})
