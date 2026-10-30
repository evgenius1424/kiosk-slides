import type { Widget } from './components'
import type { MessageWidget, Presentation, SlideChrome } from './types'
import subsets from './font-files.json'
import { WIDGET_GAP, textLines, widgetHeight } from './widget-height'
import type { Language } from './words'

export const scales = ['normal', 'large', 'hero'] as const
export type Scale = (typeof scales)[number]

export type FontFile = {
  family: string
  file: string
  weights: string
  range: string
  role: 'core' | 'extended' | 'cyrillic'
}

export type Font = {
  id: string
  name: string
  width: number
  cyrillicWidth: number
  files: FontFile[]
}

export type PresentationLook = { font: string; scale: Scale; brand: string; language: Language }
export type SlideLook = PresentationLook & { extended: boolean }

export const fonts: Font[] = [
  font('classic', 'Classic', 0.56, 0.62, []),
  font('inter', 'Inter', 0.56, 0.63, [
    ...latin('Inter', 'inter'),
    cyrillic('Inter', 'inter-cyrillic'),
  ]),
  font('figtree', 'Figtree', 0.53, 0.62, [
    ...latin('Figtree', 'figtree'),
    cyrillic('Golos Text', 'golos-text-cyrillic'),
  ]),
  font('bricolage-grotesque', 'Bricolage Grotesque', 0.56, 0.62, [
    ...latin('Bricolage Grotesque', 'bricolage-grotesque'),
    cyrillic('Onest', 'onest-cyrillic'),
  ]),
  font('space-grotesk', 'Space Grotesk', 0.56, 0.62, [
    ...latin('Space Grotesk', 'space-grotesk'),
    cyrillic('Onest', 'onest-cyrillic'),
  ]),
  font('archivo-expanded', 'Archivo Expanded', 0.68, 0.81, [
    ...latin('Archivo Expanded', 'archivo-expanded'),
    cyrillic('Unbounded', 'unbounded-cyrillic'),
  ]),
  font('golos-text', 'Golos Text', 0.56, 0.62, [
    ...latin('Golos Text', 'golos-text'),
    cyrillic('Golos Text', 'golos-text-cyrillic'),
  ]),
]

export const EXTENDED_TEXT = extendedText(fonts.flatMap(f => f.files))

export const DEFAULT_BRAND = 'kiosk'
export const defaultLook = (): PresentationLook => ({
  font: fonts[0].id,
  scale: 'normal',
  brand: DEFAULT_BRAND,
  language: 'en',
})

export const presentationLook = (presentation: Presentation): SlideLook => {
  const { font, scale, brand, language } = presentation
  const text = JSON.stringify(presentation)
  return { font, scale, brand, language, extended: EXTENDED_TEXT.test(text + text.toUpperCase()) }
}

export const isScale = (value: string | undefined): value is Scale =>
  scales.includes(value as Scale)
export const findFont = (id: string) => fonts.find(f => f.id === id) ?? fonts[0]
export const fontId = (value: string) =>
  fonts.find(f => f.id === value.trim().toLowerCase().replace(/\s+/g, '-'))?.id

export const fontFace = (file: FontFile, src: string, extended: boolean) =>
  `@font-face{font-family:'${fontFamily(file.family, extended)}';src:url(${src}) format('woff2');font-weight:${file.weights};font-display:swap;unicode-range:${file.range}}`

export const siteFontFaces = (src: (file: string) => string) =>
  fontFiles(fonts)
    .flatMap(file =>
      file.role === 'cyrillic'
        ? [false, true].map(extended => ({ file, extended }))
        : [{ file, extended: file.role === 'extended' }],
    )
    .map(({ file, extended }) => fontFace(file, src(file.file), extended))
    .join('')

export const fontFamily = (family: string, extended: boolean) =>
  extended ? `${family} Extended` : family

export const fontStack = (font: Font, extended: boolean) =>
  [...new Set(font.files.map(f => `'${fontFamily(f.family, extended)}'`))]
    .concat('Arial', 'Helvetica', 'sans-serif')
    .join(',')

export const fontFilesFor = (font: Font, extended: boolean, text: string) =>
  font.files.filter(f =>
    f.role === 'cyrillic' ? fontChars(f, text).length > 0 : (f.role === 'extended') === extended,
  )

export const fontChars = (file: FontFile, text: string) => {
  const chars = codepoints(file.range)
  return [...new Set(text)].filter(c => chars.has(c.codePointAt(0)!))
}

export function headingSize(
  slide: SizedSlide,
  { scale, font }: Pick<PresentationLook, 'scale' | 'font'>,
): number | undefined {
  if (scale === 'normal') return undefined
  const box = boxes[scale]
  const { text, charWidth, textWidth, body } = measure(slide, box, font)
  if (slide.kind === 'message') {
    const height = box.height - body
    return fit(
      text,
      charWidth,
      box.width,
      box.message,
      5,
      (lines, size) => lines * box.lineHeight * size <= height,
    )
  }
  const width = slide.kind === 'code' ? box.width * 0.48 : box.width
  const most = Math.max(2, text.split('\n').length)
  const below =
    slide.kind === 'code'
      ? 0
      : WIDGET_GAP +
        widgetHeight(
          slide,
          { ...box.text, table: tableSize(slide, { scale, font }) ?? TABLE_TEXT },
          textWidth,
        )
  const height = box.room - CLEARANCE - body - below
  return fit(
    text,
    charWidth,
    width,
    box.widget,
    MIN_HEADING,
    (lines, size) => lines <= most && lines * box.lineHeight * size <= height,
  )
}

export function tableSize(
  slide: SizedSlide,
  { scale, font }: Pick<PresentationLook, 'scale' | 'font'>,
): number | undefined {
  if (slide.kind !== 'table') return undefined
  const box = boxes[scale]
  const { text, charWidth, textWidth, body } = measure(slide, box, font)
  const room = box.room - CLEARANCE - body - headingHeight(text, charWidth, box, MIN_HEADING)
  for (let size = TABLE_TEXT; size > MIN_TABLE_TEXT; size = round(size - 0.05)) {
    const height = WIDGET_GAP + widgetHeight(slide, { ...box.text, table: size }, textWidth)
    if (height <= room) return size === TABLE_TEXT ? undefined : size
  }
  return MIN_TABLE_TEXT
}

export function textFit(
  slide: SizedSlide,
  { scale, font }: Pick<PresentationLook, 'scale' | 'font'>,
): number | undefined {
  if (slide.kind === 'code' || slide.kind === 'table') return undefined
  const box = boxes[scale]
  const { text, charWidth, textWidth } = measure(slide, box, font)
  const size = headingSize(slide, { scale, font }) ?? NORMAL_HEADING[slide.kind] ?? MIN_HEADING
  const room = box.room - CLEARANCE - headingHeight(text, charWidth, box, size)
  const height = (fit: number) =>
    bodyHeight(slide.body, box, textWidth, fit) +
    (slide.kind === 'message'
      ? 0
      : WIDGET_GAP + widgetHeight(slide, scaled(box.text, fit), textWidth))
  if (height(1) <= room || height(MIN_TEXT_FIT) === height(1)) return undefined
  for (let fit = 0.95; fit > MIN_TEXT_FIT; fit = round(fit - 0.05))
    if (height(fit) <= room) return fit
  return MIN_TEXT_FIT
}

type SizedSlide = Pick<SlideChrome, 'heading' | 'body'> & (MessageWidget | Widget)

type Box = (typeof boxes)[Scale]

const CYRILLIC_LETTERS = /[\u0400-\u04ff]/g
const LATIN_LETTERS = /[a-z]/gi

const MIN_HEADING = 5
const TABLE_TEXT = 2
const MIN_TABLE_TEXT = 1.3
const CLEARANCE = 1.5
const HEADING_CHAR = 0.85
const MIN_TEXT_FIT = 0.6

const NORMAL_HEADING: Partial<Record<SizedSlide['kind'], number>> = {
  message: 6.5,
  image: 6.5,
  buttons: 6.5,
}

const boxes = {
  normal: {
    bodyWidth: 75,
    width: 80,
    height: 35,
    room: 40,
    lineHeight: 1.08,
    message: 6.5,
    widget: 5,
    body: 2.2,
    text: { width: 90, gap: 1, list: 2.2, quote: 3.1, small: 2.1, caption: 2.6 },
  },
  large: {
    bodyWidth: 80,
    width: 86,
    height: 35,
    room: 40,
    lineHeight: 1.05,
    message: 9,
    widget: 6,
    body: 2.4,
    text: { width: 90, gap: 1, list: 2.2, quote: 3.1, small: 2.1, caption: 2.6 },
  },
  hero: {
    bodyWidth: 80,
    width: 92,
    height: 39,
    room: 43.5,
    lineHeight: 1,
    message: 16,
    widget: 11,
    body: 2.7,
    text: { width: 92, gap: 1, list: 2.6, quote: 3.6, small: 2.4, caption: 3 },
  },
}

function measure(slide: SizedSlide, box: Box, font: string) {
  const text = slide.heading.map(p => p.text).join('')
  const textWidth = fontWidth(font, slideText(slide))
  return {
    text,
    charWidth: fontWidth(font, text),
    textWidth,
    body: bodyHeight(slide.body, box, textWidth, 1),
  }
}

function headingHeight(text: string, charWidth: number, box: Box, size: number) {
  const perLine = box.width / (charWidth * HEADING_CHAR * size)
  return Math.max(1, wrap(text, perLine)) * box.lineHeight * size
}

function fontWidth(font: string, text: string) {
  return mostlyCyrillic(text) ? findFont(font).cyrillicWidth : findFont(font).width
}

function slideText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(slideText).join(' ')
  if (value && typeof value === 'object')
    return Object.entries(value)
      .filter(([key]) => key !== 'kind')
      .map(([, item]) => slideText(item))
      .join(' ')
  return ''
}

function scaled<T extends Record<string, number>>(text: T, fit: number): T & { table: number } {
  const sizes = Object.fromEntries(
    Object.entries(text).map(([key, size]) => [key, key === 'width' ? size : size * fit]),
  )
  return { ...(sizes as T), table: TABLE_TEXT }
}

function round(size: number) {
  return Math.round(size * 100) / 100
}

function fit(
  text: string,
  charWidth: number,
  width: number,
  max: number,
  min: number,
  fits: (lines: number, size: number) => boolean,
) {
  for (let size = max; size > min; size -= 0.25) {
    const lines = wrap(text, width / (charWidth * size))
    if (lines && fits(lines, size)) return size
  }
  return min
}

function wrap(text: string, perLine: number) {
  let lines = 0
  for (const paragraph of text.split('\n')) {
    let used = 0
    lines++
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (word.length > perLine) return 0
      if (used && used + 1 + word.length > perLine) {
        lines++
        used = word.length
      } else used += (used ? 1 : 0) + word.length
    }
  }
  return lines
}

function bodyHeight(body: string, box: Box, charWidth: number, fit: number) {
  if (!body) return 0
  const size = box.body * fit
  return textLines(body, box.bodyWidth, size, charWidth) * 1.5 * size + 2.5 * fit
}

function font(
  id: string,
  name: string,
  width: number,
  cyrillicWidth: number,
  files: FontFile[],
): Font {
  return { id, name, width, cyrillicWidth, files }
}

function latin(family: string, name: string): FontFile[] {
  return [
    subset(family, `${name}-core.woff2`, 'core'),
    subset(family, `${name}-extended.woff2`, 'extended'),
  ]
}

function cyrillic(family: string, name: string): FontFile {
  return subset(family, `${name}.woff2`, 'cyrillic')
}

function subset(family: string, file: string, role: FontFile['role']): FontFile {
  const { weights, range } = subsets[file as keyof typeof subsets]
  return { family, file, weights, range, role }
}

function codepoints(range: string) {
  const chars = new Set<number>()
  for (const part of range.split(',')) {
    const [start, end = start] = part
      .slice(2)
      .split('-')
      .map(hex => parseInt(hex, 16))
    for (let c = start; c <= end; c++) chars.add(c)
  }
  return chars
}

function fontFiles(fonts: Font[]) {
  return [...new Map(fonts.flatMap(f => f.files).map(file => [file.file, file])).values()]
}

function extendedText(files: FontFile[]) {
  const chars = (role: FontFile['role']) =>
    files.filter(f => f.role === role).flatMap(f => [...codepoints(f.range)])
  const core = new Set(chars('core'))
  return charClass(chars('extended').filter(c => !core.has(c)))
}

function charClass(chars: number[]) {
  const escaped = [...new Set(chars)].map(c => `\\u{${c.toString(16)}}`).join('')
  return new RegExp(`[${escaped}]`, 'u')
}

function mostlyCyrillic(text: string) {
  return (text.match(CYRILLIC_LETTERS)?.length ?? 0) > (text.match(LATIN_LETTERS)?.length ?? 0)
}
