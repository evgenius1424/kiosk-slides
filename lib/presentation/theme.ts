import { setFrontMatter } from './front-matter'

export const themes = ['room-dark', 'room-light', 'studio', 'paper', 'poster', 'marker'] as const
export type Theme = (typeof themes)[number]

export const pillThemes: Theme[] = ['poster', 'marker']

export const tones = [
  tone('Mono', '#ffffff', '#000000', '#ffffff', '#1f1b16', '#ffffff', '#111111'),
  tone('Violet', '#b0a2ff', '#5f42d3', '#b6aaff', '#5e45cd', '#a491ff', '#bcb2ff'),
  tone('Coral', '#ff8577', '#d33d2c', '#ff917f', '#af2c1f', '#fd6844', '#ffa191'),
  tone('Teal', '#3cd9c4', '#008874', '#45dfca', '#0a7463', '#34dbb9', '#63e7d4'),
  tone('Amber', '#ffb848', '#bd6100', '#ffc25b', '#9e5209', '#ffc428', '#fed835'),
] as const

export const defaultTone = (theme: Theme) =>
  tones.find(t => t.name === THEME_DEFAULTS[theme].tone)!.colors[theme]

export const defaultFont = (theme: Theme) => THEME_DEFAULTS[theme].font

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

export function toneInk(color: string) {
  const tone = luminance(color)
  return (tone + 0.05) / (luminance(INK) + 0.05) >= 1.05 / (tone + 0.05) ? INK : '#ffffff'
}

const INK = '#111111'

const THEME_DEFAULTS: Record<Theme, { tone: (typeof tones)[number]['name']; font: string }> = {
  'room-dark': { tone: 'Mono', font: 'classic' },
  'room-light': { tone: 'Mono', font: 'classic' },
  studio: { tone: 'Mono', font: 'classic' },
  paper: { tone: 'Coral', font: 'literata' },
  poster: { tone: 'Coral', font: 'archivo-expanded' },
  marker: { tone: 'Amber', font: 'inter' },
}

function tone<Name extends string>(
  name: Name,
  dark: string,
  light: string,
  studio: string,
  paper: string,
  poster: string,
  marker: string,
) {
  return {
    name,
    colors: { 'room-dark': dark, 'room-light': light, studio, paper, poster, marker },
  }
}

function luminance(color: string) {
  const hex = color.replace('#', '')
  const full = hex.length < 6 ? hex.slice(0, 3).replace(/./g, c => c + c) : hex.slice(0, 6)
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
