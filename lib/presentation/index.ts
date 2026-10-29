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
export {
  PILL_LINE_HEIGHT,
  PILL_PAD,
  PILL_TALL_LINE_HEIGHT,
  PILL_TRACKING,
  pillEdges,
  tallPill,
} from './pill'
export { pillFonts } from './pill-fonts'
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
  defaultFont,
  defaultTone,
  isTheme,
  pillThemes,
  setPresentationTheme,
  themes,
  toneColor,
  toneHint,
  toneName,
  tones,
  toneInk,
  type Theme,
} from './theme'
export type { Presentation, Slide, SlideChrome, SlideKind, SlideOfKind } from './types'
