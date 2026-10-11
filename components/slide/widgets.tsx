import type { ComponentType } from 'react'
import type { SlideKind, SlideOfKind } from '@/lib/deck'
import { ChartWidget } from './chart'
import { CodeWidget } from './code'
import { ImageWidget } from './image'
import { StepsWidget } from './steps'

/** The render component for each slide kind. TypeScript fails here until every kind has one. */
export const widgets: { [K in SlideKind]: ComponentType<{ slide: SlideOfKind<K> }> | null } = {
  message: null,
  steps: StepsWidget,
  code: CodeWidget,
  image: ImageWidget,
  chart: ChartWidget,
}
