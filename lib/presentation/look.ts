import type { Presentation, Slide } from './types'

export const scales = ['normal', 'large', 'kiosk'] as const
export type Scale = (typeof scales)[number]

export type Font = {
  id: string
  name: string
  stack: string
  width: number
  file?: string
  weights?: string
}

export type PresentationLook = { font: string; scale: Scale; brand: string }

export const fonts: Font[] = [
  { id: 'classic', name: 'Classic', stack: 'Arial,Helvetica,sans-serif', width: 0.56 },
  {
    id: 'inter',
    name: 'Inter',
    stack: "'Inter',Arial,sans-serif",
    width: 0.56,
    file: 'inter.woff2',
    weights: '100 900',
  },
  {
    id: 'figtree',
    name: 'Figtree',
    stack: "'Figtree',Arial,sans-serif",
    width: 0.53,
    file: 'figtree.woff2',
    weights: '300 900',
  },
  {
    id: 'bricolage-grotesque',
    name: 'Bricolage Grotesque',
    stack: "'Bricolage Grotesque',Arial,sans-serif",
    width: 0.56,
    file: 'bricolage-grotesque.woff2',
    weights: '200 800',
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    stack: "'Space Grotesk',Arial,sans-serif",
    width: 0.56,
    file: 'space-grotesk.woff2',
    weights: '300 700',
  },
  {
    id: 'archivo-expanded',
    name: 'Archivo Expanded',
    stack: "'Archivo Expanded',Arial,sans-serif",
    width: 0.68,
    file: 'archivo-expanded.woff2',
    weights: '100 900',
  },
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

export function fontFace({ name, file, weights }: Font, src: string) {
  return file
    ? `@font-face{font-family:'${name}';src:url(${src}) format('woff2');font-weight:${weights};font-display:swap}`
    : ''
}

export function headingSize(
  slide: Pick<Slide, 'kind' | 'heading' | 'body'>,
  { scale, font }: Pick<PresentationLook, 'scale' | 'font'>,
): number | undefined {
  if (scale === 'normal') return undefined
  const box = boxes[scale]
  const text = slide.heading.map(p => p.text).join('')
  const charWidth = findFont(font).width
  if (slide.kind === 'message') {
    const height = box.height - bodyHeight(slide.body, box.body, charWidth)
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
  return fit(text, charWidth, width, box.widget, 5, lines => lines <= 2)
}

const boxes = {
  large: { width: 86, height: 35, lineHeight: 1.05, message: 9, widget: 6, body: 2.4 },
  kiosk: { width: 92, height: 39, lineHeight: 1, message: 16, widget: 7, body: 2.7 },
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

function bodyHeight(body: string, size: number, charWidth: number) {
  if (!body) return 0
  const perLine = 75 / ((charWidth + 0.04) * size)
  const lines = body
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / perLine)), 0)
  return lines * 1.5 * size + 2.5
}
