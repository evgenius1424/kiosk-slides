import { terms } from './language'
import { UNTITLED } from './parse'
import type { Presentation } from './types'

export function reviewPresentation(presentation: Presentation) {
  const { slides } = presentation
  const problems: string[] = []
  if (presentation.title === UNTITLED)
    problems.push(
      `Give the presentation a short ${terms.presentationTitle} with title: in its ${terms.frontMatter}.`,
    )
  const missing = (['title', 'label', 'footer'] as const).filter(key => slides.some(s => !s[key]))
  if (missing.length) {
    const numbers = slides.flatMap((s, i) => (missing.some(key => !s[key]) ? [i + 1] : []))
    problems.push(
      `Give every slide its ${terms.slideSettings} with a ${terms.slideTitle}, a ${terms.label} and a ${terms.footer} (${missing.join(', ')} missing on ${list(numbers).toLowerCase()}).`,
    )
  }
  const plain = slides.flatMap((s, i) => (s.kind === 'message' ? [i + 1] : []))
  const allowed = Math.max(2, Math.ceil(slides.length / 3))
  if (slides.length >= 4 && plain.length > allowed)
    problems.push(
      `${list(plain)} are ${terms.messageSlide}s with only a ${terms.heading} and ${terms.body}. Turn some into steps, before/after, a metric, a chart, a table or a flow, so at most ${allowed} slides have no ${terms.widget}.`,
    )
  const unnamed = slides.flatMap((s, i) => (s.kind === 'image' && !s.alt.trim() ? [i + 1] : []))
  if (unnamed.length) problems.push(`${list(unnamed)}: describe the image in its alt text.`)
  return problems
}

function list(numbers: number[]) {
  return `${numbers.length === 1 ? 'Slide' : 'Slides'} ${numbers.join(', ')}`
}
