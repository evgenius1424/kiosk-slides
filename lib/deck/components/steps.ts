import { defineWidget } from './types'

export type StepsWidget = { kind: 'steps'; steps: string[] }

/** A flat ordered list `1. 2. 3.` */
export const steps = defineWidget<StepsWidget>({
  kind: 'steps',
  matches: ({ node }) => node.type === 'list' && node.ordered === true,
  parse: ({ node, raw, fail, line }) => {
    if (node.type !== 'list') return fail('Steps must be a numbered list.')
    if (node.children.length > 5) fail('Use at most five steps.')
    const steps = node.children.map(item => {
      if (item.children.some(child => child.type === 'list')) fail('Flatten the list — nesting isn’t supported.', line)
      const text = raw(item.children)
      if (text.length > 95) fail('Supporting content is too long. Shorten it or split the slide.')
      return text
    })
    return { kind: 'steps', steps }
  },
})
