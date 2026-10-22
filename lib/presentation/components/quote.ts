import { messages } from './shared'
import { defineWidget } from './types'

export type QuoteWidget = { kind: 'quote'; text: string; by: string }

export const quote = defineWidget<QuoteWidget>({
  kind: 'quote',
  matches: ({ node }) => node.type === 'blockquote',
  parse: ({ node, raw, fail }) => {
    if (node.type !== 'blockquote') return fail('A quote starts with > on each line.')
    if (node.children.some(child => child.type !== 'paragraph'))
      fail('A quote holds only text, with an optional last line such as — Name.')
    const lines = raw(node)
      .split('\n')
      .map(l => l.replace(/^\s*>\s?/, '').trim())
    const last = lines.findLastIndex(Boolean)
    const attribution = lines[last]?.match(/^(?:—|--|-)\s*(.+)$/)?.[1]
    const text = (attribution ? lines.slice(0, last) : lines).join('\n').trim()
    if (!text) fail('Write the quote itself above the — Name line.')
    if (text.length > 200 || (attribution?.length ?? 0) > 60) fail(messages.tooLong)
    return { kind: 'quote', text, by: attribution?.trim() ?? '' }
  },
})
