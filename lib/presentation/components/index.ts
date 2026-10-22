import { beforeAfter } from './before-after'
import { bullets } from './bullets'
import { buttons } from './buttons'
import { chart } from './chart'
import { checklist } from './checklist'
import { code } from './code'
import { flow } from './flow'
import { image } from './image'
import { metric } from './metric'
import { quote } from './quote'
import { steps } from './steps'
import { table } from './table'
import type { WidgetOf } from './types'

/** Every supporting widget kind. Add a new kind by adding its module here. Order matters for unannotated matching. */
export const widgetComponents = [
  steps,
  checklist, // before bullets: a - [x] list is a checklist
  bullets,
  quote,
  code,
  image,
  beforeAfter, // before table: a Before | After table is the comparison, not data
  table,
  buttons,
  metric,
  flow,
  chart,
] as const

export type Widget = WidgetOf<(typeof widgetComponents)[number]>
