export {
  insertSlide,
  moveSlide,
  parsePresentation,
  removeSlide,
  replaceSlide,
  slideLines,
  slideSource,
  UNTITLED,
} from './parse'
export { formatPresentation } from './format'
export { reviewPresentation } from './review'
export { avoided, avoidedWording, terms } from './language'
export { setFrontMatter } from './front-matter'
export { headingText, type HeadingPart } from './heading'
export { DEFAULT_TRANSITION, isTransition, transitions, type Transition } from './transition'
export {
  DEFAULT_BRAND,
  presentationLook,
  defaultLook,
  findFont,
  fontFace,
  fontFiles,
  hasCyrillic,
  fontId,
  fonts,
  headingSize,
  isScale,
  scales,
  tableSize,
  textFit,
  type PresentationLook,
  type Scale,
} from './look'
export {
  defaultTone,
  isTheme,
  setPresentationTheme,
  themes,
  toneColor,
  toneHint,
  toneName,
  tones,
  type Theme,
} from './theme'
export type { Presentation, Slide, SlideChrome, SlideKind, SlideOfKind } from './types'
