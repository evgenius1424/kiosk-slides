import { toString } from 'mdast-util-to-string'
import { defineWidget } from './types'

export type Button = { label: string; url: string }
export type ButtonsWidget = { kind: 'buttons'; buttons: Button[] }

/** `<!-- buttons -->` above a bullet list of `[Label](https://...)` links. */
export const buttons = defineWidget<ButtonsWidget>({
  kind: 'buttons',
  annotation: 'buttons',
  parse: ({ node, line, fail }) => {
    if (node.type !== 'list' || node.ordered) return fail('Buttons must be a bullet list of [Label](https://...) links.')
    if (node.children.length > 3) fail('Use at most 3 buttons.')
    const buttons = node.children.map(item => {
      const itemLine = line + (item.position?.start.line ?? 0) - (node.position?.start.line ?? 0)
      const paragraph = item.children.length === 1 && item.children[0].type === 'paragraph' ? item.children[0] : undefined
      const parts = paragraph?.children.filter(child => !(child.type === 'text' && !child.value.trim())) ?? []
      const link = parts.length === 1 && parts[0].type === 'link' ? parts[0] : undefined
      if (!link) return fail('Each button must be a single [Label](https://...) link.', itemLine)
      if (!link.url.startsWith('https://')) fail('Button links must be https:// URLs.', itemLine)
      const label = toString(link).trim()
      if (!label) fail('Give each button a label: [Label](https://...).', itemLine)
      if (label.length > 40) fail('Shorten the button label to 40 characters.', itemLine)
      return { label, url: link.url }
    })
    return { kind: 'buttons', buttons }
  },
})
