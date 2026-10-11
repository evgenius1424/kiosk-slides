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

export const DEFAULT_TONE = tones[0].color

export const isTheme = (value: string | undefined): value is Theme =>
  themes.includes(value as Theme)

export const toneColor = (value: string) =>
  tones.find(t => t.name.toLowerCase() === value.trim().toLowerCase())?.color ??
  (/^#[0-9a-f]{3,8}$/i.test(value.trim()) ? value.trim() : undefined)

export const toneHint = `Use ${tones.map(t => t.name.toLowerCase()).join(', ')} or a #hex color.`

export const setPresentationTheme = (source: string, theme: Theme) =>
  setFrontMatter(source, 'theme', theme)
