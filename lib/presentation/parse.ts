import type { Heading, Html, Node, RootContent } from 'mdast'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import { parseAnnotation, type Annotation } from './annotation'
import { defaultChrome, parseChrome } from './chrome'
import { widgetComponents, type Widget } from './components'
import { headingLength, parseHeading } from './heading'
import { defaultLook, fontId, fonts, isScale, scales } from './look'
import { DEFAULT_TRANSITION, isTransition, transitions, type Transition } from '../player'
import { DEFAULT_TONE, isTheme, themes, toneColor, toneHint, type Theme } from './theme'
import { messages } from './components/shared'
import type { Block } from './components/types'
import type { Presentation, MessageWidget, Slide } from './types'

export const UNTITLED = 'Untitled presentation'

const markdown = remark().use(remarkGfm)

const unsupportedHints: Partial<Record<string, string>> = {
  list: ' Use a numbered list for steps, or annotate the block.',
  heading: ' Use one # heading per slide.',
}

const annotationTypes: string[] = widgetComponents.flatMap(c =>
  c.annotation ? [c.annotation] : [],
)
const misplacedAnnotation =
  'Put the <!-- … --> comment on the line directly above the block it annotates.'
const isComment = (node: RootContent): node is Html =>
  node.type === 'html' && node.value.trimStart().startsWith('<!--')

type Chunk = { text: string; line: number }
type Position = RootContent['position']

const failAt = (line: number, message: string): never => {
  throw new Error(`Line ${line}: ${message}`)
}

export function parsePresentation(source: string): Presentation {
  const lines = source.replace(/\r/g, '').split('\n')
  const { duration, start, look, ...settings } = parseFrontMatter(lines)
  const chunks = splitSlides(lines, start).filter(c => c.text.trim())
  const slides = chunks.map(parseSlide)
  if (!slides.length) failAt(1, 'Add a slide with a # headline.')
  if (slides.length > 40) failAt(chunks[40].line, 'Use at most 40 slides per presentation.')
  return { ...settings, ...look, duration: Math.max(2, Math.min(120, duration)), slides }
}

export function slideLines(source: string) {
  const lines = source.replace(/\r/g, '').split('\n')
  const end =
    lines[0]?.trim() === '---' ? lines.findIndex((l, i) => i > 0 && l.trim() === '---') : -1
  const start = lines[0]?.trim() === '---' ? (end < 0 ? lines.length : end + 1) : 0
  return chunksOf(lines, start).chunks.flatMap(c => {
    const offset = c.text.split('\n').findIndex(l => l.trim())
    return offset < 0 ? [] : [c.line + offset]
  })
}

function parseFrontMatter(lines: string[]) {
  let title = UNTITLED
  let theme: Theme = 'room-dark'
  let tone: string = DEFAULT_TONE
  let transition: Transition = DEFAULT_TRANSITION
  let shareSafe = false
  let credit = true
  let duration = 12
  let loop = true
  let start = 0
  const look = defaultLook()
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
    if (end < 0) failAt(1, 'close the front matter with ---')
    const front = lines.slice(1, end).join('\n')
    const field = (key: string) => {
      const index = lines.findIndex((l, i) => i > 0 && i < end && l.startsWith(`${key}:`))
      return { value: lines[index]?.slice(key.length + 1).trim() || undefined, line: index + 1 }
    }
    title = front.match(/^title:\s*(.+)$/m)?.[1] || title
    const themeField = field('theme')
    if (isTheme(themeField.value)) theme = themeField.value
    else if (themeField.value)
      failAt(themeField.line, `Unknown theme “${themeField.value}”. Use ${themes.join(' or ')}.`)
    const toneField = field('tone')
    if (toneField.value)
      tone =
        toneColor(toneField.value) ??
        failAt(toneField.line, `Unknown tone “${toneField.value}”. ${toneHint}`)
    const transitionField = field('transition')
    if (transitionField.value && isTransition(transitionField.value.toLowerCase()))
      transition = transitionField.value.toLowerCase() as Transition
    else if (transitionField.value)
      failAt(
        transitionField.line,
        `Unknown transition “${transitionField.value}”. Use ${transitions.join(', ')}.`,
      )
    const safeField = field('share-safe')
    if (safeField.value === 'true' || safeField.value === 'false')
      shareSafe = safeField.value === 'true'
    else if (safeField.value)
      failAt(safeField.line, `Set share-safe to true or false, not “${safeField.value}”.`)
    const creditField = field('credit')
    if (creditField.value === 'true' || creditField.value === 'false')
      credit = creditField.value === 'true'
    else if (creditField.value)
      failAt(creditField.line, `Set credit to true or false, not “${creditField.value}”.`)
    const font = field('font')
    if (font.value)
      look.font =
        fontId(font.value) ??
        failAt(font.line, `Unknown font “${font.value}”. Use ${fonts.map(f => f.id).join(', ')}.`)
    const scale = field('scale')
    if (isScale(scale.value)) look.scale = scale.value
    else if (scale.value)
      failAt(scale.line, `Unknown scale “${scale.value}”. Use ${scales.join(', ')}.`)
    const brand = field('brand')
    if (brand.value && brand.value.length > 24)
      failAt(brand.line, 'Keep the brand to 24 characters.')
    if (brand.value) look.brand = brand.value === 'none' ? '' : brand.value
    duration = Number(front.match(/duration:\s*(\d+)s/)?.[1] || 12)
    loop = !/loop:\s*false/.test(front)
    start = end + 1
  }
  return { title, theme, tone, transition, shareSafe, credit, duration, loop, start, look }
}

/** Split on bare `---` lines outside code fences. Each chunk remembers its first absolute line. */
function splitSlides(lines: string[], start: number): Chunk[] {
  const { chunks, fenceLine } = chunksOf(lines, start)
  if (fenceLine) failAt(fenceLine, 'Close the code block with ```')
  return chunks
}

function chunksOf(lines: string[], start: number) {
  const chunks: { text: string[]; line: number }[] = [{ text: [], line: start + 1 }]
  let fenceLine = 0 // 1-based line of the open code fence, 0 when outside one
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```')) fenceLine = fenceLine ? 0 : i + 1
    if (!fenceLine && line.trim() === '---') chunks.push({ text: [], line: i + 2 })
    else chunks[chunks.length - 1].text.push(line)
  }
  return { chunks: chunks.map(c => ({ text: c.text.join('\n'), line: c.line })), fenceLine }
}

/** Reject annotation keys the widget doesn't declare, so a typo like `typ=bar` gets a pointed message. */
function checkSettings(
  { type, args }: Annotation,
  { settings = [] }: { settings?: readonly string[] },
  fail: (message: string) => never,
) {
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
    return list.length
      ? chunk.text.slice(
          list[0].position?.start.offset ?? 0,
          list.at(-1)!.position?.end.offset ?? 0,
        )
      : ''
  }

  const nodes = markdown.parse(chunk.text).children
  const headings = nodes.filter((n): n is Heading => n.type === 'heading' && n.depth === 1)
  if (headings.length !== 1)
    fail(
      'Each slide needs exactly one # heading.',
      headings[1] ? lineOf(headings[1].position) : chunk.line,
    )
  const headingNode = headings[0]
  const headingLine = lineOf(headingNode.position)
  const heading = parseHeading(headingNode, message => fail(message, headingLine))
  if (headingLength(heading) > 115)
    fail('Shorten the headline to 115 characters or split the slide.', headingLine)

  // The settings comment is the slide's first node, directly followed by the heading.
  const first = nodes[0]
  const hasChrome = isComment(first) && nodes[1] === headingNode
  const chrome = hasChrome
    ? parseChrome(first.value, message => fail(message, lineOf(first.position)))
    : defaultChrome()

  const body: string[] = []
  let widget: Widget | MessageWidget = { kind: 'message' }
  const rest = nodes.filter(node => node !== headingNode && !(hasChrome && node === first))
  for (let i = 0; i < rest.length; i++) {
    let node = rest[i]
    let line = lineOf(node.position)
    let annotation: Block['annotation']
    if (isComment(node)) {
      // An annotation applies to the block that starts on the very next line.
      const next = rest[i + 1]
      const nextLine = next && lineOf(next.position)
      if (!next || isComment(next) || nextLine !== chunk.line + node.position!.end.line)
        fail(misplacedAnnotation, line)
      annotation = {
        ...parseAnnotation(node.value, message => fail(message, line), annotationTypes),
        line,
      }
      node = next
      line = nextLine
      i++
    }
    const block: Block = {
      node,
      line,
      lineOf: target => lineOf(target.position),
      annotation,
      raw,
      fail: (message, where = line) => fail(message, where),
    }
    const component = annotation
      ? widgetComponents.find(c => c.annotation === annotation.type)
      : widgetComponents.find(c => !c.annotation && c.matches?.(block))
    if (annotation && component)
      checkSettings(annotation, component, message => fail(message, annotation.line))
    if (component) {
      if (widget.kind !== 'message') fail('Use one supporting widget per slide.', line)
      widget = component.parse(block)
    } else if (node.type === 'paragraph') body.push(raw(node))
    else
      fail(
        `This slide has markdown the format doesn’t support (${node.type}).${unsupportedHints[node.type] ?? ''}`,
        line,
      )
  }
  if (body.join('\n\n').length > 320) fail(messages.tooLong)

  return { ...widget, ...chrome, heading, body: body.join('\n\n') }
}
