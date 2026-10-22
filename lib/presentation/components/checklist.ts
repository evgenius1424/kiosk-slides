import { messages } from './shared'
import { defineWidget } from './types'

export type ChecklistWidget = { kind: 'checklist'; items: { text: string; done: boolean }[] }

export const checklist = defineWidget<ChecklistWidget>({
  kind: 'checklist',
  matches: ({ node }) =>
    node.type === 'list' && !node.ordered && node.children.some(item => item.checked != null),
  parse: ({ node, raw, fail, line }) => {
    if (node.type !== 'list') return fail('A checklist is a list of - [ ] and - [x] items.')
    if (node.children.length > 5) fail('Use at most five checklist items.')
    const items = node.children.map(item => {
      if (item.checked == null) fail('Start every checklist item with [ ] or [x].', line)
      if (item.children.some(child => child.type === 'list')) fail(messages.flattenList, line)
      const text = raw(item.children)
      if (text.length > 95) fail(messages.tooLong)
      return { text, done: item.checked === true }
    })
    return { kind: 'checklist', items }
  },
})
