import type { Slide } from './deck/types'

export const transitions = ['gentle', 'fade', 'slide', 'none'] as const

export type Transition = (typeof transitions)[number]
export type ActiveTransition = Transition | 'share'
export type PlayerAction =
  'next' | 'previous' | 'first' | 'last' | 'autoplay' | 'fullscreen' | 'shareSafe'

export const DEFAULT_TRANSITION: Transition = 'gentle'

export const TRANSITION_MS: Record<ActiveTransition, number> = {
  gentle: 880,
  fade: 600,
  slide: 700,
  share: 160,
  none: 0,
}

export const PLAYER_KEYS: Record<string, PlayerAction> = {
  ArrowRight: 'next',
  ArrowDown: 'next',
  PageDown: 'next',
  ' ': 'next',
  ArrowLeft: 'previous',
  ArrowUp: 'previous',
  PageUp: 'previous',
  Home: 'first',
  End: 'last',
  p: 'autoplay',
  f: 'fullscreen',
  s: 'shareSafe',
}

export const SWIPE = { distance: 45, ratio: 1.2 }
export const WHEEL = { distance: 65, settleMs: 240, lineHeight: 16 }
export const IDLE_MS = 2600

export function isTransition(value: string): value is Transition {
  return transitions.includes(value as Transition)
}

export function activeTransition(transition: Transition, shareSafe: boolean): ActiveTransition {
  return shareSafe && transition !== 'none' ? 'share' : transition
}

export function playerAction(event: KeyboardEvent): PlayerAction | undefined {
  if (event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey)
    return
  return PLAYER_KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key]
}

export function slideSeconds(slide: Slide, duration: number) {
  return slide.duration || duration
}

export function swipeDelta(dx: number, dy: number, vertical: boolean) {
  if (vertical && Math.abs(dy) > Math.abs(dx)) return dy
  return Math.abs(dx) > Math.abs(dy) * SWIPE.ratio ? dx : 0
}

export const transitionStyles = `
.kt-enter{z-index:1}.kt-leave{z-index:0;pointer-events:none}.kt-enter,.kt-leave{will-change:opacity,transform}
[data-transition=gentle] .kt-enter{animation:kt-rise .7s cubic-bezier(.16,1,.3,1) .18s both}[data-transition=gentle] .kt-leave{animation:kt-sink .26s cubic-bezier(.4,0,1,1) both}
[data-transition=fade] .kt-enter{animation:kt-fade-in .45s ease-out .15s both}[data-transition=fade] .kt-leave{animation:kt-fade-out .3s ease-in both}
[data-transition=slide] .kt-enter{animation:kt-slide-in .6s cubic-bezier(.16,1,.3,1) .1s both}[data-transition=slide] .kt-leave{animation:kt-slide-out .32s cubic-bezier(.4,0,1,1) both}
[data-transition=share] .kt-enter{animation:kt-fade-in .16s linear both}[data-transition=share] .kt-leave{visibility:hidden}
@keyframes kt-fade-in{from{opacity:0}}@keyframes kt-fade-out{to{opacity:0}}
@keyframes kt-rise{from{opacity:0;transform:translateY(2.5%) scale(.985)}}@keyframes kt-sink{to{opacity:0;transform:translateY(-1.2%) scale(.995)}}
@keyframes kt-slide-in{from{opacity:0;transform:translateX(calc(var(--kt-dir,1)*12%))}}@keyframes kt-slide-out{to{opacity:0;transform:translateX(calc(var(--kt-dir,1)*-12%))}}
@media(prefers-reduced-motion:reduce){[data-transition] .kt-enter{animation:kt-fade-in .16s linear both!important}[data-transition] .kt-leave{animation:none!important;visibility:hidden}[data-transition=none] .kt-enter{animation:none!important}}
`
