export const STARTERS = ['pitch', 'update', 'allHands', 'lesson', 'onboarding', 'lobby'] as const
export const AUDIENCES = ['team', 'leadership', 'customers', 'class', 'screen'] as const
export const LENGTHS = { short: 5, standard: 8, long: 12 } as const
export const GAP = '…'

export type Audience = (typeof AUDIENCES)[number]
export type Length = keyof typeof LENGTHS
export type Talk = { topic: string; audience?: Audience; length?: Length }

const AUDIENCE_TEXT: Record<Audience, string> = {
  team: 'my team',
  leadership: 'leadership',
  customers: 'customers',
  class: 'a class of learners',
  screen:
    'a public screen that plays on its own with nobody presenting, so every slide must make sense alone',
}

export function talkRequest({ topic, audience, length }: Talk) {
  return [
    `My talk: ${topic.trim()}`,
    audience && `Audience: ${AUDIENCE_TEXT[audience]}.`,
    length && `Length: about ${LENGTHS[length]} slides.`,
    'Write the whole presentation now. Where a detail is missing, make a sensible choice instead of asking me.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function requestPrompt(prompt: string, talk?: Talk) {
  return talk?.topic.trim()
    ? `${prompt}\n\nHere is my request:\n${talkRequest(talk)}`
    : `${prompt}\n\nWhat should the presentation be about?`
}

export function selectGap(field: HTMLTextAreaElement) {
  const at = field.value.indexOf(GAP)
  field.focus()
  if (at >= 0) field.setSelectionRange(at, at + GAP.length)
  else field.setSelectionRange(field.value.length, field.value.length)
}
