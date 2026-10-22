import type { ComponentType } from 'react'
import type { SlideKind, SlideOfKind } from '@/lib/presentation'
import { BeforeAfterView } from './before-after'
import { BulletsView } from './bullets'
import { ButtonsView } from './buttons'
import { ChartView } from './chart'
import { ChecklistView } from './checklist'
import { CodeView } from './code'
import { FlowView } from './flow'
import { ImageView } from './image'
import { MetricView } from './metric'
import { QuoteView } from './quote'
import { StepsView } from './steps'
import { TableView } from './table'

/** The render component for each slide kind. TypeScript fails here until every kind has one. */
export const widgets: { [K in SlideKind]: ComponentType<{ slide: SlideOfKind<K> }> | null } = {
  message: null,
  steps: StepsView,
  bullets: BulletsView,
  checklist: ChecklistView,
  quote: QuoteView,
  code: CodeView,
  image: ImageView,
  'before-after': BeforeAfterView,
  table: TableView,
  buttons: ButtonsView,
  metric: MetricView,
  flow: FlowView,
  chart: ChartView,
}
