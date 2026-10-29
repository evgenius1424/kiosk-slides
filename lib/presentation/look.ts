import type { Widget } from './components'
import type { MessageWidget, Presentation, SlideChrome } from './types'
import { PILL_PAD, PILL_TALL_LINE_HEIGHT, PILL_TRACKING } from './pill'
import { WIDGET_GAP, textLines, widgetHeight } from './widget-height'

export const scales = ['normal', 'large', 'hero'] as const
export type Scale = (typeof scales)[number]

export type FontFile = {
  family: string
  file: string
  weights: string
  script: Script
  italic?: boolean
}

export type Font = {
  id: string
  name: string
  stack: string
  width: number
  cyrillicWidth: number
  files: FontFile[]
}

export type PresentationLook = { font: string; scale: Scale; brand: string }

export const fonts: Font[] = [
  font('classic', 'Classic', 0.56, 0.62, []),
  font('inter', 'Inter', 0.56, 0.63, [
    latin('Inter', 'inter.woff2', '100 900'),
    cyrillic('Inter', 'inter-cyrillic.woff2', '100 900'),
  ]),
  font('figtree', 'Figtree', 0.53, 0.62, [
    latin('Figtree', 'figtree.woff2', '300 900'),
    cyrillic('Golos Text', 'golos-text-cyrillic.woff2', '400 900'),
  ]),
  font('bricolage-grotesque', 'Bricolage Grotesque', 0.56, 0.62, [
    latin('Bricolage Grotesque', 'bricolage-grotesque.woff2', '200 800'),
    cyrillic('Onest', 'onest-cyrillic.woff2', '100 900'),
  ]),
  font('space-grotesk', 'Space Grotesk', 0.56, 0.62, [
    latin('Space Grotesk', 'space-grotesk.woff2', '300 700'),
    cyrillic('Onest', 'onest-cyrillic.woff2', '100 900'),
  ]),
  font('archivo-expanded', 'Archivo Expanded', 0.68, 0.81, [
    latin('Archivo Expanded', 'archivo-expanded.woff2', '100 900'),
    cyrillic('Unbounded', 'unbounded-cyrillic.woff2', '200 900'),
  ]),
  font('golos-text', 'Golos Text', 0.56, 0.62, [
    latin('Golos Text', 'golos-text.woff2', '400 900'),
    cyrillic('Golos Text', 'golos-text-cyrillic.woff2', '400 900'),
  ]),
  font(
    'literata',
    'Literata',
    0.61,
    0.68,
    [
      latin('Literata', 'literata.woff2', '200 900'),
      cyrillic('Literata', 'literata-cyrillic.woff2', '200 900'),
      { ...latin('Literata', 'literata-italic.woff2', '200 900'), italic: true },
      { ...cyrillic('Literata', 'literata-italic-cyrillic.woff2', '200 900'), italic: true },
    ],
    'Georgia,serif',
  ),
]

export const DEFAULT_BRAND = 'kiosk'
export const defaultLook = (): PresentationLook => ({
  font: fonts[0].id,
  scale: 'normal',
  brand: DEFAULT_BRAND,
})

export const presentationLook = ({ font, scale, brand }: Presentation): PresentationLook => ({
  font,
  scale,
  brand,
})

export const isScale = (value: string | undefined): value is Scale =>
  scales.includes(value as Scale)
export const findFont = (id: string) => fonts.find(f => f.id === id) ?? fonts[0]
export const fontId = (value: string) =>
  fonts.find(f => f.id === value.trim().toLowerCase().replace(/\s+/g, '-'))?.id

export const fontFiles = (fonts: Font[]) => [
  ...new Map(fonts.flatMap(f => f.files).map(file => [file.file, file])).values(),
]

export const fontFace = ({ family, weights, script, italic }: FontFile, src: string) =>
  `@font-face{font-family:'${family}';src:url(${src}) format('woff2');font-weight:${weights};${italic ? 'font-style:italic;' : ''}font-display:swap;unicode-range:${RANGES[script]}}`

export const hasCyrillic = (text: string) => CYRILLIC.test(text)

export function headingSize(slide: SizedSlide, { scale, font, pill }: Sizing): number | undefined {
  if (scale === 'normal' && !pill) return undefined
  const box = sizedBox(scale, pill)
  const { text, charWidth, textWidth, body } = measure(slide, box, font, pill)
  if (scale === 'normal') return normalPillHeading(slide, box, text, charWidth, textWidth)
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
          { ...box.text, table: tableSize(slide, { scale, font, pill }) ?? TABLE_TEXT },
          textWidth,
        )
  const height = box.room - CLEARANCE - body - below
  return fit(
    text,
    charWidth,
    width,
    box.widget,
    pill ? MIN_PILL_HEADING : MIN_HEADING,
    (lines, size) => lines <= most && lines * box.lineHeight * size <= height,
  )
}

export function tableSize(slide: SizedSlide, { scale, font, pill }: Sizing): number | undefined {
  if (slide.kind !== 'table') return undefined
  const box = sizedBox(scale, pill)
  const { text, charWidth, textWidth, body } = measure(slide, box, font, pill)
  const room = box.room - CLEARANCE - body - headingHeight(text, charWidth, box, MIN_HEADING)
  for (let size = TABLE_TEXT; size > MIN_TABLE_TEXT; size = round(size - 0.05)) {
    const height = WIDGET_GAP + widgetHeight(slide, { ...box.text, table: size }, textWidth)
    if (height <= room) return size === TABLE_TEXT ? undefined : size
  }
  return MIN_TABLE_TEXT
}

export function textFit(slide: SizedSlide, { scale, font, pill }: Sizing): number | undefined {
  if (slide.kind === 'code' || slide.kind === 'table') return undefined
  const box = sizedBox(scale, pill)
  const { text, charWidth, textWidth } = measure(slide, box, font, pill)
  const size =
    headingSize(slide, { scale, font, pill }) ?? NORMAL_HEADING[slide.kind] ?? MIN_HEADING
  const room = box.room - CLEARANCE - headingHeight(text, charWidth, box, size)
  const height = (fit: number) => contentHeight(slide, box, textWidth, fit)
  if (height(1) <= room || height(MIN_TEXT_FIT) === height(1)) return undefined
  for (let fit = 0.95; fit > MIN_TEXT_FIT; fit = round(fit - 0.05))
    if (height(fit) <= room) return fit
  return MIN_TEXT_FIT
}

type Script = 'latin' | 'cyrillic'

type Sizing = Pick<PresentationLook, 'scale' | 'font'> & { pill?: boolean }

type SizedSlide = Pick<SlideChrome, 'heading' | 'body'> & (MessageWidget | Widget)

type Box = (typeof boxes)[Scale]

const RANGES: Record<Script, string> = {
  latin:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  cyrillic: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
}

const CYRILLIC = /[\u0400-\u04ff]/
const CYRILLIC_LETTERS = /[\u0400-\u04ff]/g
const LATIN_LETTERS = /[a-z]/gi

const MIN_HEADING = 5
const TABLE_TEXT = 2
const MIN_TABLE_TEXT = 1.3
const CLEARANCE = 1.5
const HEADING_CHAR = 0.85
const MIN_TEXT_FIT = 0.6
const MIN_PILL_HEADING = 3.3
const PILL_ROOM = 0.6

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

function normalPillHeading(
  slide: SizedSlide,
  box: Box,
  text: string,
  charWidth: number,
  textWidth: number,
) {
  if (slide.kind === 'code' || slide.kind === 'table') return undefined
  const start = NORMAL_HEADING[slide.kind] ?? MIN_HEADING
  const below = contentHeight(slide, box, textWidth, MIN_TEXT_FIT)
  for (let size = start; size > MIN_PILL_HEADING; size -= 0.25)
    if (headingHeight(text, charWidth, box, size) + below <= box.room - CLEARANCE)
      return size === start ? undefined : size
  return MIN_PILL_HEADING
}

function contentHeight(slide: SizedSlide, box: Box, textWidth: number, fit: number) {
  return (
    bodyHeight(slide.body, box, textWidth, fit) +
    (slide.kind === 'message'
      ? 0
      : WIDGET_GAP + widgetHeight(slide, scaled(box.text, fit), textWidth))
  )
}

function pillPadding(font: string) {
  return '_'.repeat(Math.ceil((PILL_PAD * 2 - PILL_TRACKING) / findFont(font).width))
}

function sizedBox(scale: Scale, pill?: boolean): Box {
  const box = boxes[scale]
  if (!pill) return box
  return {
    ...box,
    lineHeight: PILL_TALL_LINE_HEIGHT,
    height: box.height - PILL_ROOM,
    room: box.room - PILL_ROOM,
  }
}

function measure(slide: SizedSlide, box: Box, font: string, pill?: boolean) {
  const text = slide.heading
    .map(p => (pill && p.highlight ? pillPadding(font) + p.text : p.text))
    .join('')
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
  fallback = 'Arial,Helvetica,sans-serif',
): Font {
  const families = [...new Set(files.map(f => `'${f.family}'`))]
  return {
    id,
    name,
    stack: [...families, fallback].join(','),
    width,
    cyrillicWidth,
    files,
  }
}

function latin(family: string, file: string, weights: string): FontFile {
  return { family, file, weights, script: 'latin' }
}

function cyrillic(family: string, file: string, weights: string): FontFile {
  return { family, file, weights, script: 'cyrillic' }
}

function mostlyCyrillic(text: string) {
  return (text.match(CYRILLIC_LETTERS)?.length ?? 0) > (text.match(LATIN_LETTERS)?.length ?? 0)
}
