import { defineWidget } from './types'

export type MetricWidget = { kind: 'metric'; value: string; caption: string }

/** `<!-- metric -->` above a paragraph whose first line is `**value**` and whose next line is the caption. */
export const metric = defineWidget<MetricWidget>({
  kind: 'metric',
  annotation: 'metric',
  parse: ({ node, raw, fail }) => {
    const [valueLine, ...captionLines] = node.type === 'paragraph' ? raw(node).split('\n') : []
    const value = valueLine?.trim().match(/^(\*\*|__)(.+)\1$/)?.[2].trim()
    if (node.type !== 'paragraph' || node.children[0]?.type !== 'strong' || !value) {
      return fail('A metric starts with a bold value line, such as **3x**.')
    }
    const caption = captionLines.map(l => l.trim()).join(' ').trim()
    if (!caption) fail('Add a caption line directly below the metric’s bold value.')
    return { kind: 'metric', value, caption }
  },
})
