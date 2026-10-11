import { setFrontMatter } from './front-matter'

export const themes = ['room-dark', 'room-light'] as const
export type Theme = (typeof themes)[number]

export const tones = [
  { name: 'Graphite', color: '#74747e' },
  { name: 'Plum', color: '#9676ac' },
  { name: 'Wine', color: '#a16b7b' },
  { name: 'Teal', color: '#669a98' },
  { name: 'Bronze', color: '#ac9167' },
] as const

export const isTheme = (value: string | undefined): value is Theme => themes.includes(value as Theme)

export const setDeckTheme = (source: string, theme: Theme) => setFrontMatter(source, 'theme', theme)
