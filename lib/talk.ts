import { languages } from '@/lib/presentation'

export const GOALS = ['convince', 'teach', 'expertise', 'care'] as const
export const LANGUAGES = languages
export const LENGTHS = { short: 5, standard: 8, long: 12 } as const

export type Goal = (typeof GOALS)[number]
export type TalkLanguage = (typeof LANGUAGES)[number]
export type Length = keyof typeof LENGTHS
export type Talk = { topic: string; goal?: Goal; language?: TalkLanguage; length?: Length }

const GOAL_TEXT: Record<Goal, string> = {
  convince:
    'convince them. Open with the point or the ask, back it with the strongest evidence, answer the obvious doubt, and end on one clear next step. Sound sure, never salesy.',
  teach:
    'teach them. Start from what they already know, give one idea per slide in a clear order with a concrete example for each, and end with a short recap. Sound patient and plain.',
  expertise:
    'show that I know this well. Be precise: real numbers, sources and trade-offs, no hype or filler words, and name the limits honestly. Sound calm and confident.',
  care: 'show that I care about this and about them. Speak to people directly with "we" and "you", use a real story or example, say why it matters to them, and end on what we will do. Sound warm and sincere, never sentimental.',
}

const LANGUAGE_TEXT: Record<TalkLanguage, string> = {
  en: 'write every slide in English.',
  ru: 'write every slide in Russian and set `language: ru`.',
}

export function talkRequest({ topic, goal, language, length }: Talk) {
  return [
    `My talk: ${topic.trim()}`,
    goal && `Goal: ${GOAL_TEXT[goal]}`,
    language && `Language: ${LANGUAGE_TEXT[language]}`,
    length && `Length: about ${LENGTHS[length]} slides.`,
    'Write the whole presentation now. Where a detail is missing, make a sensible choice instead of asking me.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function longestRequestFrame() {
  return Math.max(
    ...GOALS.flatMap(goal =>
      LANGUAGES.map(language => talkRequest({ topic: '', goal, language, length: 'long' }).length),
    ),
  )
}

export function requestPrompt(prompt: string, talk?: Talk) {
  return talk?.topic.trim()
    ? `${prompt}\n\nHere is my request:\n${talkRequest(talk)}`
    : `${prompt}\n\nWhat should the presentation be about?`
}
