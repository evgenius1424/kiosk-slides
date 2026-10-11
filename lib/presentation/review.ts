import { UNTITLED } from './parse'
import type { Presentation } from './types'

export function reviewPresentation(presentation: Presentation) {
  const { slides } = presentation
  const problems: string[] = []
  if (presentation.title === UNTITLED)
    problems.push('Give the presentation a short title: in its front matter.')
  const missing = (['title', 'label', 'footer'] as const).filter(key => slides.some(s => !s[key]))
  if (missing.length) {
    const numbers = slides.flatMap((s, i) => (missing.some(key => !s[key]) ? [i + 1] : []))
    problems.push(
      `Give every slide a settings comment with a title, a label and a footer (${missing.join(', ')} missing on ${list(numbers).toLowerCase()}).`,
    )
  }
  const plain = slides.flatMap((s, i) => (s.kind === 'message' ? [i + 1] : []))
  const allowed = Math.max(2, Math.ceil(slides.length / 3))
  if (slides.length >= 4 && plain.length > allowed)
    problems.push(
      `${list(plain)} are only a heading and text. Turn some into steps, before/after, a metric, a chart, a table or a flow, so at most ${allowed} slides have no widget.`,
    )
  const unnamed = slides.flatMap((s, i) => (s.kind === 'image' && !s.alt.trim() ? [i + 1] : []))
  if (unnamed.length) problems.push(`${list(unnamed)}: describe the image in its alt text.`)
  return problems
}

function list(numbers: number[]) {
  return `${numbers.length === 1 ? 'Slide' : 'Slides'} ${numbers.join(', ')}`
}
