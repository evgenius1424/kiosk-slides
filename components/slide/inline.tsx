import { Fragment, type ReactNode } from 'react'
import type { PhrasingContent, RootContent } from 'mdast'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'

export function Inline({ text }: { text: string }) {
  const blocks = markdown.parse(text).children
  if (!blocks.every(block => block.type === 'paragraph')) return text
  return blocks.map((block, i) => (
    <Fragment key={i}>
      {i > 0 && '\n\n'}
      {phrasing(block)}
    </Fragment>
  ))
}

const markdown = remark().use(remarkGfm)

function phrasing(node: RootContent): ReactNode {
  const children = 'children' in node ? (node.children as PhrasingContent[]) : []
  const inner = children.map((child, i) => <Fragment key={i}>{phrasing(child)}</Fragment>)
  switch (node.type) {
    case 'text':
      return node.value
    case 'inlineCode':
      return <code>{node.value}</code>
    case 'break':
      return '\n'
    case 'strong':
      return <strong>{inner}</strong>
    case 'emphasis':
      return <em>{inner}</em>
    case 'delete':
      return <s>{inner}</s>
    case 'link':
      return (
        <a href={node.url} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      )
    default:
      return inner
  }
}
