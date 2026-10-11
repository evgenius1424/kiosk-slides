import type { ComponentType } from 'react'
import type { SlideKind, SlideOfKind } from '@/lib/presentation'
import { BeforeAfterView } from './before-after'
import { ButtonsView } from './buttons'
import { ChartView } from './chart'
import { CodeView } from './code'
import { FlowView } from './flow'
import { ImageView } from './image'
import { MetricView } from './metric'
import { StepsView } from './steps'
import { TableView } from './table'

/** The render component for each slide kind. TypeScript fails here until every kind has one. */
export const widgets: { [K in SlideKind]: ComponentType<{ slide: SlideOfKind<K> }> | null } = {
  message: null,
  steps: StepsView,
  code: CodeView,
  image: ImageView,
  'before-after': BeforeAfterView,
  table: TableView,
  buttons: ButtonsView,
  metric: MetricView,
  flow: FlowView,
  chart: ChartView,
}
