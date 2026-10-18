import type { Heading, Paragraph, PhrasingContent } from 'mdast'

/** A run of heading text with its styling. `highlight` is markdown bold. */
export type HeadingPart = {
  text: string
  highlight?: true
  italic?: true
  code?: true
  url?: string
}

type Marks = Omit<HeadingPart, 'text'>

const unsupported =
  'Headings support **highlight**, *italic*, `code` and [links](https://...) only.'

export function parseHeading(
  [heading, more]: [Heading, Paragraph?],
  fail: (message: string) => never,
): HeadingPart[] {
  const parts: HeadingPart[] = []
  const walk = (children: PhrasingContent[], marks: Marks) => {
    for (const child of children) {
      if (child.type === 'text') parts.push({ text: child.value, ...marks })
      else if (child.type === 'break') parts.push({ text: '\n', ...marks })
      else if (child.type === 'inlineCode') parts.push({ text: child.value, ...marks, code: true })
      else if (child.type === 'strong') walk(child.children, { ...marks, highlight: true })
      else if (child.type === 'emphasis') walk(child.children, { ...marks, italic: true })
      else if (child.type === 'link') {
        if (!child.url.startsWith('https://')) fail('Heading links must be https:// URLs.')
        walk(child.children, { ...marks, url: child.url })
      } else fail(unsupported)
    }
  }
  walk(heading.children, {})
  if (more) {
    parts.push({ text: '\n' })
    walk(more.children, {})
  }
  return parts.map(part => ({ ...part, text: part.text.replace(/[ \t]*\n[ \t]*/g, '\n') }))
}

export const headingLength = (parts: HeadingPart[]) =>
  parts.reduce((sum, part) => sum + part.text.replace(/\n/g, '').length, 0)

export const headingText = (parts: HeadingPart[]) =>
  parts
    .map(part => part.text)
    .join('')
    .replace(/\s*\n\s*/g, ' ')
