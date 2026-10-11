import type { Widget } from './components'
import type { HeadingPart } from './heading'
import type { DeckLook } from './look'
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

export type Deck = DeckLook & {
  title: string
  theme: Theme
  duration: number
  loop: boolean
  slides: Slide[]
}
