export const GOALS = ['convince', 'teach', 'inform', 'inspire'] as const
export const LENGTHS = { short: 5, standard: 8, long: 12 } as const

export type Goal = (typeof GOALS)[number]
export type Length = keyof typeof LENGTHS
export type Talk = { topic: string; goal?: Goal; length?: Length }

const GOAL_TEXT: Record<Goal, string> = {
  convince:
    'convince them. Open with the point or the ask, back it with the strongest evidence, answer the obvious doubt, and end on one clear next step. Sound sure, never salesy.',
  teach:
    'teach them. Start from what they already know, give one idea per slide in a clear order with a concrete example for each, and end with a short recap. Sound patient and plain.',
  inform:
    'inform them. Be precise: real numbers, sources and trade-offs, no hype or filler words, and name the limits honestly. Sound calm and sure of the facts.',
  inspire:
    'inspire them. Show why this matters to me and to them: speak directly with "we" and "you", tell a real story, and end on what we can do together. Sound warm and sincere, never sentimental.',
}

export function talkRequest({ topic, goal, length }: Talk) {
  return [
    `My talk: ${topic.trim()}`,
    goal && `Goal: ${GOAL_TEXT[goal]}`,
    length && `Length: about ${LENGTHS[length]} slides.`,
    'Write the whole presentation now. Where a detail is missing, make a sensible choice instead of asking me.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function longestRequestFrame() {
  return Math.max(...GOALS.map(goal => talkRequest({ topic: '', goal, length: 'long' }).length))
}

export function requestPrompt(prompt: string, talk?: Talk) {
  return talk?.topic.trim()
    ? `${prompt}\n\nHere is my request:\n${talkRequest(talk)}`
    : `${prompt}\n\nWhat should the presentation be about?`
}
