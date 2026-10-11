import { tableCells } from './table'
import type { Block } from './types'
import { defineWidget } from './types'

export type BeforeAfterWidget = { kind: 'before-after'; before: string; after: string }

const isBeforeAfter = (block: Block) => {
  const header = tableCells(block)?.[0]
  return (
    header?.length === 2 &&
    header[0].toLowerCase() === 'before' &&
    header[1].toLowerCase() === 'after'
  )
}

/** A two-column GFM table headed exactly `Before | After` (any case), with one row. */
export const beforeAfter = defineWidget<BeforeAfterWidget>({
  kind: 'before-after',
  matches: isBeforeAfter,
  parse: block => {
    const [, ...rows] =
      tableCells(block) ?? block.fail('Before/after must be a Before | After table.')
    if (!rows.length) block.fail('Add one row under Before | After with the two things to compare.')
    if (rows.length > 1)
      block.fail('Before/after is a single comparison — use a plain table for more rows.')
    const [before = '', after = ''] = rows[0]
    return { kind: 'before-after', before, after }
  },
})
