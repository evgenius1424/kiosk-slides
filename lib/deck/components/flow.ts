import { messages } from './shared'
import { defineWidget } from './types'

/** Each line is one arrow chain of box labels. Boxes with identical text across lines are the same node. */
export type FlowWidget = { kind: 'flow'; lines: string[][] }

/** `<!-- flow -->` above a bullet list of `A -> B -> C` chains. */
export const flow = defineWidget<FlowWidget>({
  kind: 'flow',
  annotation: 'flow',
  parse: ({ node, raw, fail }) => {
    if (node.type !== 'list' || node.ordered) return fail('A flow is a bullet list of chains such as - Write -> Parse -> Present.')
    const cap = 'A flow supports at most 2 lines of up to 4 boxes each.'
    if (node.children.length > 2) fail(cap)
    const lines = node.children.map(item => {
      if (item.children.some(child => child.type === 'list')) fail(messages.flattenList)
      const boxes = raw(item.children).split('->').map(box => box.trim())
      if (boxes.some(box => !box)) fail('Every box in a flow needs text, e.g. - Write -> Parse -> Present.')
      if (boxes.length > 4) fail(cap)
      return boxes
    })
    // With at most two chains, a loop is a box repeated in one chain, or shared boxes met in opposite orders.
    const [first, second = []] = lines
    const shared = first.filter(box => second.includes(box))
    const sameOrder = shared.every((box, i) => i === 0 || second.indexOf(shared[i - 1]) < second.indexOf(box))
    if (lines.some(line => new Set(line).size < line.length) || !sameOrder) fail('A flow can’t loop back to an earlier box. Give the boxes different text.')
    return { kind: 'flow', lines }
  },
})
