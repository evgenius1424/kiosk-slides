import { slideSource } from './presentation'

export const SLIDE_ACTIONS = ['shorter', 'visual', 'split', 'headline', 'widget'] as const
export const SLIDES_OPEN = '<slides>'
export const SLIDES_CLOSE = '</slides>'

export type SlideAction = (typeof SLIDE_ACTIONS)[number]

const ACTION_TEXT: Record<SlideAction, string> = {
  shorter:
    'Make this slide shorter: fewer words, same point. Keep its widget unless a simpler one says it better.',
  visual:
    'Make this slide visual: turn its text into the widget that shows the point best, such as steps, before/after, a metric, a chart, a table or a flow.',
  split:
    'Split this slide in two: return exactly two slides, one idea each, separated by a line holding only ---.',
  headline:
    'Give this slide a stronger headline: state the point as a claim, with the key phrase in **bold**. Keep the rest of the slide as it is.',
  widget:
    'Show this slide with a different widget than the one it uses now, the one that fits its content best. Keep the point and the words where you can.',
}

export function isSlideAction(value: unknown): value is SlideAction {
  return SLIDE_ACTIONS.includes(value as SlideAction)
}

export function slideRequest(action: SlideAction, source: string, index: number) {
  return `The whole presentation, for context:\n<presentation>\n${source.trim()}\n</presentation>\n\nThe slide to change, slide ${index + 1}:\n<slide>\n${slideSource(source, index)}\n</slide>\n\n${ACTION_TEXT[action]}`
}

export function slideCopyRequest(
  prompt: string,
  action: SlideAction,
  source: string,
  index: number,
) {
  return `${prompt}\n\n${slideRequest(action, source, index)}`
}

export function extractSlides(text: string) {
  const reply = text.replace(/\r\n?/g, '\n')
  const open = reply.lastIndexOf(SLIDES_OPEN)
  const close = reply.indexOf(SLIDES_CLOSE, open)
  const body =
    open >= 0 && close >= 0 ? reply.slice(open + SLIDES_OPEN.length, close) : unfence(reply.trim())
  return body
    .trim()
    .replace(/^(---[ \t]*\n\s*)+/, '')
    .replace(/(\n\s*---[ \t]*)+$/, '')
    .trim()
}

function unfence(text: string) {
  const lines = text.split('\n')
  const labelled = lines.findIndex(l => /^(`{3,}|~{3,})\s*(markdown|md)\s*$/i.test(l))
  const open = labelled >= 0 ? labelled : /^(`{3,}|~{3,})\s*$/.test(lines[0]) ? 0 : -1
  if (open < 0) return text
  const fence = lines[open].match(/^(`{3,}|~{3,})/)![1]
  const close = lines.findLastIndex((l, i) => i > open && l.trim() === fence)
  return close < 0 ? text : lines.slice(open + 1, close).join('\n')
}
