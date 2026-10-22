import { messages } from './shared'
import { defineWidget } from './types'

export type BulletsWidget = { kind: 'bullets'; items: string[] }

export const bullets = defineWidget<BulletsWidget>({
  kind: 'bullets',
  matches: ({ node }) => node.type === 'list' && !node.ordered,
  parse: ({ node, raw, fail, line }) => {
    if (node.type !== 'list') return fail('Bullets must be a - list.')
    if (node.children.length > 5) fail('Use at most five bullets.')
    const items = node.children.map(item => {
      if (item.children.some(child => child.type === 'list')) fail(messages.flattenList, line)
      const text = raw(item.children)
      if (text.length > 95) fail(messages.tooLong)
      return text
    })
    return { kind: 'bullets', items }
  },
})
