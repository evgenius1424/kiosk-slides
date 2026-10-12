export {
  insertSlide,
  parsePresentation,
  removeSlide,
  replaceSlide,
  slideLines,
  slideSource,
  UNTITLED,
} from './parse'
export { formatPresentation } from './format'
export { reviewPresentation } from './review'
export { setFrontMatter } from './front-matter'
export type { HeadingPart } from './heading'
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
  type PresentationLook,
  type Scale,
} from './look'
export {
  DEFAULT_TONE,
  isTheme,
  setPresentationTheme,
  themes,
  toneColor,
  toneHint,
  tones,
  type Theme,
} from './theme'
export type { Presentation, Slide, SlideChrome, SlideKind, SlideOfKind } from './types'
