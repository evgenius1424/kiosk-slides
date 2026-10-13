import { setFrontMatter } from './front-matter'

export const themes = ['room-dark', 'room-light', 'studio'] as const
export type Theme = (typeof themes)[number]

export const tones = [
  tone('Mono', '#ffffff', '#000000', '#ffffff'),
  tone('Violet', '#a594ff', '#5b45d6', '#b9abff'),
  tone('Coral', '#ff8577', '#c8392b', '#ff9a8d'),
  tone('Teal', '#4fd1c5', '#0f7f76', '#5fe3d6'),
  tone('Amber', '#ffb547', '#a65d00', '#ffc566'),
] as const

export const defaultTone = (theme: Theme) => tones[0].colors[theme]

export const isTheme = (value: string | undefined): value is Theme =>
  themes.includes(value as Theme)

export const toneName = (color: string, theme: Theme) =>
  tones.find(t => t.colors[theme] === color)?.name.toLowerCase()

export const toneColor = (value: string, theme: Theme) => {
  const key = value.trim().toLowerCase()
  const name = FORMER_TONES[key] ?? key
  return (
    tones.find(t => t.name.toLowerCase() === name)?.colors[theme] ??
    (/^#[0-9a-f]{3,8}$/.test(key) ? value.trim() : undefined)
  )
}

export const toneHint = `Use ${tones.map(t => t.name.toLowerCase()).join(', ')} or a #hex color.`

export const setPresentationTheme = (source: string, theme: Theme) =>
  setFrontMatter(source, 'theme', theme)

const FORMER_TONES: Record<string, string> = {
  graphite: 'mono',
  plum: 'violet',
  wine: 'coral',
  bronze: 'amber',
}

function tone<Name extends string>(name: Name, dark: string, light: string, studio: string) {
  return { name, colors: { 'room-dark': dark, 'room-light': light, studio } }
}
