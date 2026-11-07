import { setFrontMatter } from './front-matter'

export const themes = ['room-dark', 'room-light', 'studio'] as const
export type Theme = (typeof themes)[number]

export const tones = [
  tone('Mono', '#ffffff', '#000000', '#ffffff'),
  tone('Violet', '#b0a2ff', '#5f42d3', '#b6aaff'),
  tone('Coral', '#ff8577', '#d33d2c', '#ff917f'),
  tone('Teal', '#3cd9c4', '#008874', '#45dfca'),
  tone('Amber', '#ffb848', '#bd6100', '#ffc25b'),
] as const

export const defaultTone = (theme: Theme) => tones[0].colors[theme]

export const isTheme = (value: string | undefined): value is Theme =>
  themes.includes(value as Theme)

export const toneName = (color: string, theme: Theme) =>
  tones.find(t => t.colors[theme] === color)?.name.toLowerCase()

export const toneColor = (value: string, theme: Theme) => {
  const key = value.trim().toLowerCase()
  return (
    tones.find(t => t.name.toLowerCase() === key)?.colors[theme] ??
    (/^#[0-9a-f]{3,8}$/.test(key) ? value.trim() : undefined)
  )
}

export const toneHint = `Use ${tones.map(t => t.name.toLowerCase()).join(', ')} or a #hex color.`

export const setPresentationTheme = (source: string, theme: Theme) =>
  setFrontMatter(source, 'theme', theme)

function tone<Name extends string>(name: Name, dark: string, light: string, studio: string) {
  return { name, colors: { 'room-dark': dark, 'room-light': light, studio } }
}
