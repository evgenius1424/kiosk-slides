import { code } from './code'
import { flow } from './flow'
import { image } from './image'
import { steps } from './steps'
import type { WidgetOf } from './types'

/** Every supporting widget kind. Add a new kind by adding its module here. Order matters for unannotated matching. */
export const widgetComponents = [
  steps,
  code,
  image,
  flow,
] as const

export type Widget = WidgetOf<(typeof widgetComponents)[number]>
