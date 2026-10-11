import { beforeAfter } from './before-after'
import { code } from './code'
import { image } from './image'
import { steps } from './steps'
import { table } from './table'
import type { WidgetOf } from './types'

/** Every supporting widget kind. Add a new kind by adding its module here. Order matters for unannotated matching. */
export const widgetComponents = [
  steps,
  code,
  image,
  beforeAfter, // before table: a Before | After table is the comparison, not data
  table,
] as const

export type Widget = WidgetOf<(typeof widgetComponents)[number]>
