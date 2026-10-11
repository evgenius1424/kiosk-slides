import type { Heading, Html, Node, RootContent } from 'mdast'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import { parseAnnotation, type Annotation } from './annotation'
import { defaultChrome, parseChrome } from './chrome'
import { widgetComponents, type Widget } from './components'
import { messages } from './components/shared'
import type { Block } from './components/types'
import type { Deck, MessageWidget, Slide } from './types'

const markdown = remark().use(remarkGfm)

const unsupportedHints: Partial<Record<string, string>> = {
  list: ' Use a numbered list for steps, or annotate the block.',
  heading: ' Use one # heading per slide.',
}

const annotationTypes: string[] = widgetComponents.flatMap(c => (c.annotation ? [c.annotation] : []))
const misplacedAnnotation = 'Put the <!-- … --> comment on the line directly above the block it annotates.'
const isComment = (node: RootContent): node is Html => node.type === 'html' && node.value.trimStart().startsWith('<!--')

type Chunk = { text: string; line: number }
type Position = RootContent['position']

const failAt = (line: number, message: string): never => { throw new Error(`Line ${line}: ${message}`) }

/** Parse a deck. Throws an `Error` whose message starts with `Line N:` when the source breaks a rule. */
export function parseDeck(source: string): Deck {
  const lines = source.replace(/\r/g, '').split('\n')
  const { title, duration, loop, start } = parseFrontMatter(lines)
  const chunks = splitSlides(lines, start).filter(c => c.text.trim())
  const slides = chunks.map(parseSlide)
  if (!slides.length) failAt(1, 'Add a slide with a # headline.')
  if (slides.length > 40) failAt(chunks[40].line, 'Use at most 40 slides per deck.')
  return { title, duration: Math.max(2, Math.min(120, duration)), loop, slides }
}

function parseFrontMatter(lines: string[]) {
  let title = 'Untitled deck'; let duration = 12; let loop = true; let start = 0
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
    if (end < 0) failAt(1, 'close the front matter with ---')
    const front = lines.slice(1, end).join('\n')
    title = front.match(/^title:\s*(.+)$/m)?.[1] || title
    const themeIndex = lines.findIndex((l, i) => i > 0 && i < end && /^theme:/.test(l))
    const theme = lines[themeIndex]?.match(/^theme:\s*(.+)$/)?.[1]
    if (theme && !['room-dark', 'room-light'].includes(theme)) failAt(themeIndex + 1, `Unknown theme “${theme}”. Use room-dark or room-light.`)
    duration = Number(front.match(/duration:\s*(\d+)s/)?.[1] || 12)
    loop = !/loop:\s*false/.test(front)
    start = end + 1
  }
  return { title, duration, loop, start }
}

/** Split on bare `---` lines outside code fences. Each chunk remembers its first absolute line. */
function splitSlides(lines: string[], start: number): Chunk[] {
  const chunks: { text: string[]; line: number }[] = [{ text: [], line: start + 1 }]
  let fenceLine = 0 // 1-based line of the open code fence, 0 when outside one
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```')) fenceLine = fenceLine ? 0 : i + 1
    if (!fenceLine && line.trim() === '---') chunks.push({ text: [], line: i + 2 })
    else chunks[chunks.length - 1].text.push(line)
  }
  if (fenceLine) failAt(fenceLine, 'Close the code block with ```')
  return chunks.map(c => ({ text: c.text.join('\n'), line: c.line }))
}

/** Reject annotation keys the widget doesn't declare, so a typo like `typ=bar` gets a pointed message. */
function checkSettings({ type, args }: Annotation, { settings = [] }: { settings?: readonly string[] }, fail: (message: string) => never) {
  const unknown = Object.keys(args).find(key => !settings.includes(key))
  if (!unknown) return
  const allowed = settings.length ? `Use one of: ${settings.join(', ')}.` : 'It takes no settings.'
  fail(`<!-- ${type} --> has no setting “${unknown}”. ${allowed}`)
}

function parseSlide(chunk: Chunk): Slide {
  const lineOf = (position: Position) => chunk.line + (position?.start.line ?? 1) - 1
  const fail = (message: string, line = chunk.line): never => failAt(line, message)
  const raw = (target: Node | Node[]) => {
    const list = Array.isArray(target) ? target : [target]
    return list.length ? chunk.text.slice(list[0].position?.start.offset ?? 0, list.at(-1)!.position?.end.offset ?? 0) : ''
  }

  const nodes = markdown.parse(chunk.text).children
  const headings = nodes.filter((n): n is Heading => n.type === 'heading' && n.depth === 1)
  if (headings.length !== 1) fail('Each slide needs exactly one # heading.', headings[1] ? lineOf(headings[1].position) : chunk.line)
  const headingNode = headings[0]
  const heading = raw(headingNode).replace(/^#\s+/, '').replace(/\s+#*\s*$/, '')
  const headingLine = lineOf(headingNode.position)
  if (heading.length > 115) fail('Shorten the headline to 115 characters or split the slide.', headingLine)
  if ((heading.match(/==/g)?.length || 0) % 2) fail('Close the ==highlight== span.', headingLine)

  // The settings comment is the slide's first node, directly followed by the heading.
  const first = nodes[0]
  const hasChrome = isComment(first) && nodes[1] === headingNode
  const chrome = hasChrome ? parseChrome(first.value, message => fail(message, lineOf(first.position))) : defaultChrome()

  const body: string[] = []
  let widget: Widget | MessageWidget = { kind: 'message' }
  const rest = nodes.filter(node => node !== headingNode && !(hasChrome && node === first))
  for (let i = 0; i < rest.length; i++) {
    let node = rest[i]
    let line = lineOf(node.position)
    let annotation: Annotation | undefined
    const commentLine = line
    if (isComment(node)) {
      // An annotation applies to the block that starts on the very next line.
      const next = rest[i + 1]
      const nextLine = next && lineOf(next.position)
      if (!next || isComment(next) || nextLine !== chunk.line + node.position!.end.line) fail(misplacedAnnotation, line)
      annotation = parseAnnotation(node.value, message => fail(message, line), annotationTypes)
      node = next; line = nextLine; i++
    }
    const block: Block = { node, line, lineOf: target => lineOf(target.position), annotation, raw, fail: (message, where = line) => fail(message, where) }
    const component = annotation
      ? widgetComponents.find(c => c.annotation === annotation.type)
      : widgetComponents.find(c => !c.annotation && c.matches?.(block))
    if (annotation && component) checkSettings(annotation, component, message => fail(message, commentLine))
    if (component) {
      if (widget.kind !== 'message') fail('Use one supporting widget per slide.', line)
      widget = component.parse(block)
    } else if (node.type === 'paragraph') body.push(raw(node))
    else fail(`This slide has markdown the format doesn’t support (${node.type}).${unsupportedHints[node.type] ?? ''}`, line)
  }
  if (body.join('\n\n').length > 320) fail(messages.tooLong)

  return { ...widget, ...chrome, heading, body: body.join('\n\n') }
}
