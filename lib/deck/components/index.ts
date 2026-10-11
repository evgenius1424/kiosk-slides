import { beforeAfter } from './before-after'
import { code } from './code'
import { flow } from './flow'
import { image } from './image'
import { metric } from './metric'
import { steps } from './steps'
import { table } from './table'
import { buttons } from './buttons'
import type { WidgetOf } from './types'

/** Every supporting widget kind. Add a new kind by adding its module here. Order matters for unannotated matching. */
export const widgetComponents = [
  steps,
  code,
  image,
  beforeAfter, // before table: a Before | After table is the comparison, not data
  table,
  buttons,
  metric,
  flow,
] as const

export type Widget = WidgetOf<(typeof widgetComponents)[number]>
