import { code } from './code'
import { image } from './image'
import { metric } from './metric'
import { steps } from './steps'
import type { WidgetOf } from './types'

/** Every supporting widget kind. Add a new kind by adding its module here. Order matters for unannotated matching. */
export const widgetComponents = [
  steps,
  code,
  image,
  metric,
] as const

export type Widget = WidgetOf<(typeof widgetComponents)[number]>
