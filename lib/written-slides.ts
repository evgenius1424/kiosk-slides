import { headingText, parsePresentation, type Presentation, type Slide } from './presentation'

export type SlideMark = 'new' | 'changed' | 'waiting'
export type SlideChanges = { changed: number; added: number; removed: number }

export function writtenSource(text: string, done = false) {
  return done ? text.trim() : finishedPart(text.trimStart())
}

export function parseWritten(source: string): Presentation | null {
  if (!source) return null
  try {
    return parsePresentation(source)
  } catch {
    return null
  }
}

export function writingSlides(before: Slide[], written: Slide[]) {
  const matches = matchSlides(before, written)
  const matched = matches.filter(m => m.at >= 0)
  const rest = matched.length ? Math.max(...matched.map(m => m.at)) + 1 : written.length
  const waiting = before.slice(rest)
  return {
    slides: [...written, ...waiting],
    marks: [...matches.map(m => m.mark), ...waiting.map(() => 'waiting' as const)],
  }
}

export function slideMarks(before: Slide[], after: Slide[]) {
  return matchSlides(before, after).map(m => m.mark)
}

export function slideChanges(before: Slide[], after: Slide[]): SlideChanges {
  const matches = matchSlides(before, after)
  return {
    changed: matches.filter(m => m.mark === 'changed').length,
    added: matches.filter(m => m.mark === 'new').length,
    removed: before.length - matches.filter(m => m.at >= 0).length,
  }
}

function finishedPart(source: string) {
  const lines = source.replace(/\r/g, '').split('\n')
  const frontMatter = lines[0]?.trim() === '---'
  const end = frontMatter ? lines.findIndex((l, i) => i > 0 && l.trim() === '---') : -1
  if (frontMatter && end < 0) return ''
  let fence = false
  let last = -1
  for (let i = end + 1; i < lines.length; i++) {
    if (lines[i].startsWith('```')) fence = !fence
    if (!fence && lines[i].trim() === '---') last = i
  }
  const slides = lines.slice(end + 1, Math.max(last, end + 1)).join('\n')
  return slides.trim() ? lines.slice(0, last).join('\n') : ''
}

function matchSlides(before: Slide[], after: Slide[]) {
  const used = new Set<number>()
  const at = after.map(() => -1)
  const pass = (same: (from: Slide, to: Slide) => boolean) =>
    after.forEach((slide, j) => {
      if (at[j] >= 0) return
      const i = before.findIndex((b, k) => !used.has(k) && same(b, slide))
      if (i >= 0) used.add((at[j] = i))
    })
  pass((a, b) => slideKey(a) === slideKey(b))
  const unchanged = at.map(i => i >= 0)
  pass((a, b) => slideName(a) === slideName(b))
  after.forEach((_, j) => {
    if (at[j] >= 0) return
    const from = Math.max(-1, ...at.slice(0, j))
    const to = at.slice(j + 1).find(i => i >= 0) ?? before.length
    const i = before.findIndex(
      (b, k) => k > from && k < to && !used.has(k) && !b.title && !after[j].title,
    )
    if (i >= 0) used.add((at[j] = i))
  })
  return at.map((i, j) => ({
    at: i,
    mark: unchanged[j] ? undefined : i < 0 ? ('new' as const) : ('changed' as const),
  }))
}

function slideKey(slide: Slide) {
  return JSON.stringify(slide)
}

function slideName(slide: Slide) {
  return (slide.title || headingText(slide.heading)).trim().toLowerCase()
}
