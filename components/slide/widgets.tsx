import type { ComponentType } from 'react'
import type { SlideKind, SlideOfKind } from '@/lib/deck'
import { BeforeAfterWidget } from './before-after'
import { CodeWidget } from './code'
import { ImageWidget } from './image'
import { MetricWidget } from './metric'
import { StepsWidget } from './steps'
import { TableWidget } from './table'
import { ButtonsWidget } from './buttons'

/** The render component for each slide kind. TypeScript fails here until every kind has one. */
export const widgets: { [K in SlideKind]: ComponentType<{ slide: SlideOfKind<K> }> | null } = {
  message: null,
  steps: StepsWidget,
  code: CodeWidget,
  image: ImageWidget,
  'before-after': BeforeAfterWidget,
  table: TableWidget,
  buttons: ButtonsWidget,
  metric: MetricWidget,
}
