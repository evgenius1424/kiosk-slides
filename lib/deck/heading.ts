import type { Heading, PhrasingContent } from 'mdast'

/** A run of heading text with its styling. `highlight` is markdown bold. */
export type HeadingPart = { text: string; highlight?: true; italic?: true; code?: true; url?: string }

type Marks = Omit<HeadingPart, 'text'>

const unsupported = 'Headings support **highlight**, *italic*, `code` and [links](https://...) only.'

/** Flatten a heading's inline markdown into styled parts, or fail on markup a slide can't show. */
export function parseHeading(node: Heading, fail: (message: string) => never): HeadingPart[] {
  const parts: HeadingPart[] = []
  const walk = (children: PhrasingContent[], marks: Marks) => {
    for (const child of children) {
      if (child.type === 'text') parts.push({ text: child.value, ...marks })
      else if (child.type === 'inlineCode') parts.push({ text: child.value, ...marks, code: true })
      else if (child.type === 'strong') walk(child.children, { ...marks, highlight: true })
      else if (child.type === 'emphasis') walk(child.children, { ...marks, italic: true })
      else if (child.type === 'link') {
        if (!child.url.startsWith('https://')) fail('Heading links must be https:// URLs.')
        walk(child.children, { ...marks, url: child.url })
      } else fail(unsupported)
    }
  }
  walk(node.children, {})
  return parts
}

export const headingLength = (parts: HeadingPart[]) => parts.reduce((sum, part) => sum + part.text.length, 0)
