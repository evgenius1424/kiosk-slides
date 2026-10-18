export const transitions = ['gentle', 'fade', 'slide', 'none'] as const

export type Transition = (typeof transitions)[number]

export const DEFAULT_TRANSITION: Transition = 'gentle'

export function isTransition(value: string): value is Transition {
  return transitions.includes(value as Transition)
}
