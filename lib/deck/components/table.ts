import type { Block } from './types'
import { defineWidget } from './types'

export type TableWidget = { kind: 'table'; header: string[]; rows: string[][] }

/** A GFM table's cells as written (inline markdown kept), header row first. */
export const tableCells = ({ node, raw }: Block): string[][] | undefined =>
  node.type === 'table' ? node.children.map(row => row.children.map(cell => raw(cell.children).trim())) : undefined

/** Any GFM table that isn't a chart or a before/after comparison. */
export const table = defineWidget<TableWidget>({
  kind: 'table',
  matches: ({ node }) => node.type === 'table',
  parse: block => {
    const [header, ...rows] = tableCells(block) ?? block.fail('A table must be a markdown table.')
    if (header.length > 5) block.fail('Use at most 5 columns in a table.')
    if (rows.length > 6) block.fail('Use at most 6 rows in a table (not counting the header).')
    return { kind: 'table', header, rows }
  },
})
