export const terms = {
  presentation: 'presentation',
  presentationSource: 'presentation source',
  frontMatter: 'front matter',
  presentationTitle: 'presentation title',
  savedPresentation: 'saved presentation',
  presentationLibrary: 'presentation library',
  presentationName: 'presentation name',
  language: 'language',
  slide: 'slide',
  slideSettings: 'slide settings',
  slideTitle: 'slide title',
  label: 'label',
  heading: 'heading',
  body: 'body',
  footer: 'footer',
  widget: 'widget',
  messageSlide: 'message slide',
  annotation: 'annotation',
  look: 'Look',
  theme: 'theme',
  tone: 'tone',
  font: 'font',
  scale: 'scale',
  brand: 'brand',
  present: 'Present',
  transition: 'transition',
  autoplay: 'autoplay',
  duration: 'duration',
  loop: 'loop',
  screenShareSafe: 'screen-share safe',
  shareLink: 'share link',
  download: 'Download',
  render: 'Render',
  credit: 'credit',
} as const

export const avoided: Partial<Record<keyof typeof terms, readonly string[]>> = {
  presentation: ['deck', 'slide deck'],
  presentationSource: ['deck source'],
  presentationTitle: ['presentation name', 'slide title'],
  savedPresentation: ['download'],
  presentationLibrary: ['file list'],
  presentationName: ['presentation title'],
  slideTitle: ['presentation title'],
  heading: ['title'],
  look: ['layout'],
  tone: ['theme', 'brand color'],
  scale: ['zoom'],
  present: ['play'],
  autoplay: ['present'],
  shareLink: ['shared presentation'],
  download: ['export'],
  render: ['download'],
}

export function avoidedWording(text: string) {
  return mechanicalChecks.flatMap(({ word, use, pattern }) =>
    [...text.matchAll(pattern)].map(match => ({ found: match[0], word, use })),
  )
}

const EVERYDAY_WORDS = ['layout', 'play', 'title']

const termNames = new Set(Object.values(terms).map(name => name.toLowerCase()))

const mechanicalChecks = Object.entries(avoided).flatMap(([concept, words]) =>
  words
    .filter(word => !termNames.has(word) && !EVERYDAY_WORDS.includes(word))
    .map(word => ({
      word,
      use: terms[concept as keyof typeof terms],
      pattern: new RegExp(`\\b${word.replace(/ /g, '[\\s-]+')}(?:s|es|ed|ing)?\\b`, 'gi'),
    })),
)
