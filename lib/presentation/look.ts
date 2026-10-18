import type { Presentation, Slide } from './types'

export const scales = ['normal', 'large', 'hero'] as const
export type Scale = (typeof scales)[number]

export type FontFile = { family: string; file: string; weights: string; script: Script }

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

export const fontFace = ({ family, weights, script }: FontFile, src: string) =>
  `@font-face{font-family:'${family}';src:url(${src}) format('woff2');font-weight:${weights};font-display:swap;unicode-range:${RANGES[script]}}`

export const hasCyrillic = (text: string) => CYRILLIC.test(text)

export function headingSize(
  slide: Pick<Slide, 'kind' | 'heading' | 'body'>,
  { scale, font }: Pick<PresentationLook, 'scale' | 'font'>,
): number | undefined {
  if (scale === 'normal') return undefined
  const box = boxes[scale]
  const text = slide.heading.map(p => p.text).join('')
  const charWidth = mostlyCyrillic(text) ? findFont(font).cyrillicWidth : findFont(font).width
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
  const most = Math.max(2, text.split('\n').length)
  return fit(text, charWidth, width, box.widget, 5, lines => lines <= most)
}

type Script = 'latin' | 'cyrillic'

const RANGES: Record<Script, string> = {
  latin:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  cyrillic: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
}

const CYRILLIC = /[\u0400-\u04ff]/
const CYRILLIC_LETTERS = /[\u0400-\u04ff]/g
const LATIN_LETTERS = /[a-z]/gi

const boxes = {
  large: { width: 86, height: 35, lineHeight: 1.05, message: 9, widget: 6, body: 2.4 },
  hero: { width: 92, height: 39, lineHeight: 1, message: 16, widget: 11, body: 2.7 },
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

function font(
  id: string,
  name: string,
  width: number,
  cyrillicWidth: number,
  files: FontFile[],
): Font {
  const families = [...new Set(files.map(f => `'${f.family}'`))]
  return {
    id,
    name,
    stack: [...families, 'Arial', 'Helvetica', 'sans-serif'].join(','),
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
