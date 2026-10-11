export const transitions = [
  { id: 'gentle', name: 'Gentle', help: 'A soft rise and fade. Calm enough for any room.' },
  { id: 'fade', name: 'Crossfade', help: 'A clean crossfade. Smooth when you share a tab on a good connection.' },
  { id: 'slide', name: 'Slide', help: 'Slides glide sideways in the direction you move.' },
  { id: 'cinematic', name: 'Cinematic · GPU heavy', help: 'Depth, blur and a light sweep. Made for showing off on a strong GPU.' },
  { id: 'none', name: 'None · instant cut', help: 'Instant cuts. Nothing moves.' },
] as const

export type Transition = (typeof transitions)[number]['id']
export type ActiveTransition = Transition | 'share'

export const DEFAULT_TRANSITION: Transition = 'gentle'
export const SHARE_SAFE_HELP = 'Quick flat fades with no movement, blur or glow. Stays crisp in Google Meet and on meeting-room TVs.'

export const TRANSITION_MS: Record<ActiveTransition, number> = { gentle: 880, fade: 600, slide: 700, cinematic: 1450, share: 160, none: 0 }

export function isTransition(value: string): value is Transition {
  return transitions.some(t => t.id === value)
}

export function activeTransition(transition: Transition, shareSafe: boolean): ActiveTransition {
  return shareSafe && transition !== 'none' ? 'share' : transition
}

export const transitionStyles = `
.kt-enter{z-index:1}.kt-leave{z-index:0;pointer-events:none}.kt-enter,.kt-leave{will-change:opacity,transform}
[data-transition=gentle] .kt-enter{animation:kt-rise .7s cubic-bezier(.16,1,.3,1) .18s both}[data-transition=gentle] .kt-leave{animation:kt-sink .26s cubic-bezier(.4,0,1,1) both}
[data-transition=fade] .kt-enter{animation:kt-fade-in .45s ease-out .15s both}[data-transition=fade] .kt-leave{animation:kt-fade-out .3s ease-in both}
[data-transition=slide] .kt-enter{animation:kt-slide-in .6s cubic-bezier(.16,1,.3,1) .1s both}[data-transition=slide] .kt-leave{animation:kt-slide-out .32s cubic-bezier(.4,0,1,1) both}
[data-transition=cinematic] .kt-enter{animation:kt-cine-in 1.1s cubic-bezier(.16,1,.3,1) .12s both}[data-transition=cinematic] .kt-leave{animation:kt-cine-out .8s cubic-bezier(.65,0,.35,1) both}
[data-transition=cinematic] .kt-enter::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 30%,color-mix(in srgb,var(--slide-tone,#74747e) 40%,#ffffff40) 50%,transparent 70%);mix-blend-mode:screen;animation:kt-sheen 1.2s cubic-bezier(.4,0,.2,1) .25s both}
[data-transition=share] .kt-enter{animation:kt-fade-in .16s linear both}[data-transition=share] .kt-leave{visibility:hidden}
@keyframes kt-fade-in{from{opacity:0}}@keyframes kt-fade-out{to{opacity:0}}
@keyframes kt-rise{from{opacity:0;transform:translateY(2.5%) scale(.985)}}@keyframes kt-sink{to{opacity:0;transform:translateY(-1.2%) scale(.995)}}
@keyframes kt-slide-in{from{opacity:0;transform:translateX(calc(var(--kt-dir,1)*12%))}}@keyframes kt-slide-out{to{opacity:0;transform:translateX(calc(var(--kt-dir,1)*-12%))}}
@keyframes kt-cine-in{from{opacity:0;transform:perspective(1600px) translateZ(220px) rotateY(calc(var(--kt-dir,1)*-14deg));filter:blur(18px) brightness(1.5) saturate(1.4)}60%{filter:blur(0) brightness(1.08) saturate(1.1)}to{opacity:1;transform:none;filter:none}}
@keyframes kt-cine-out{to{opacity:0;transform:perspective(1600px) translateZ(-260px) rotateY(calc(var(--kt-dir,1)*18deg));filter:blur(14px) brightness(.7)}}
@keyframes kt-sheen{from{opacity:0;transform:translateX(-70%)}30%{opacity:1}to{opacity:0;transform:translateX(70%)}}
@media(prefers-reduced-motion:reduce){[data-transition] .kt-enter{animation:kt-fade-in .16s linear both!important}[data-transition] .kt-enter::after{display:none}[data-transition] .kt-leave{animation:none!important;visibility:hidden}[data-transition=none] .kt-enter{animation:none!important}}
`
