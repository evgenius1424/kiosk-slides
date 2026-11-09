import { PILL_EMOJI, PILL_GLYPHS, PILL_TALL, pillFonts } from './pill-fonts'

export { PILL_PAD } from './pill-fonts'
export const PILL_ROW_GAP = 0.12
export const PILL_TRACKING = -0.062

export const PILL_LINE_HEIGHT = lineHeight(f => f.top + f.bottom)
export const PILL_TALL_LINE_HEIGHT = lineHeight(f => f.tallTop + f.tallBottom)

export const pillFont = (id: string) => pillFonts[id] ?? pillFonts.classic

export const tallPill = (text: string) =>
  /\p{M}|\p{Extended_Pictographic}/u.test(text.normalize('NFD')) ||
  [...text].some(char => PILL_TALL.includes(char))

export function pillEdges(text: string, font: string, italic = false) {
  const metrics = pillFont(font)
  const chars = [...text.trim()]
  const starts = italic ? metrics.italicStarts : metrics.starts
  const ends = italic ? metrics.italicEnds : metrics.ends
  const first = glyph(chars[0])
  const last = glyph(chars.at(-1))
  return {
    start: first < 0 ? 0 : starts[first],
    end: last < 0 ? 0 : ends[last],
  }
}

function glyph(char?: string) {
  if (!char) return -1
  const index = PILL_GLYPHS.indexOf(char)
  return index < 0 && /\p{Extended_Pictographic}/u.test(char) ? PILL_EMOJI : index
}

function lineHeight(height: (font: (typeof pillFonts)[string]) => number) {
  return (
    Math.round((Math.max(...Object.values(pillFonts).map(height)) + PILL_ROW_GAP) * 1000) / 1000
  )
}
