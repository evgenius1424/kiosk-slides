import type { Widget } from './components'
import type { HeadingPart } from './heading'
import type { PresentationLook } from './look'
import type { Transition } from '../player'
import type { Theme } from './theme'

export type Layout = 'auto' | 'stacked' | 'split-left'

/** Fields every slide has, whatever its widget. */
export type SlideChrome = {
  title: string
  label: string
  footer: string
  heading: HeadingPart[]
  body: string
  layout: Layout
  duration?: number
}

/** A slide with no supporting widget: just the heading and body. */
export type MessageWidget = { kind: 'message' }

export type Slide = SlideChrome & (MessageWidget | Widget)
export type SlideKind = Slide['kind']
export type SlideOfKind<K extends SlideKind> = Extract<Slide, { kind: K }>

export type Presentation = PresentationLook & {
  title: string
  theme: Theme
  tone: string
  transition: Transition
  shareSafe: boolean
  credit: boolean
  duration: number
  loop: boolean
  slides: Slide[]
}
