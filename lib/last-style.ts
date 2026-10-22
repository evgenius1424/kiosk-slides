import { setFrontMatter } from './presentation'

type Style = Partial<Record<(typeof STYLE_KEYS)[number], string>>

export const STYLE_KEY = 'kiosk-style'
const STYLE_KEYS = ['theme', 'tone', 'font', 'scale'] as const

export function isStyleKey(key: string) {
  return (STYLE_KEYS as readonly string[]).includes(key)
}

export function rememberStyle(source: string) {
  try {
    localStorage.setItem(STYLE_KEY, JSON.stringify(styleOf(source)))
  } catch {}
}

export function withLastStyle(source: string) {
  const style = read()
  return style ? withStyle(source, style) : source
}

export function sameApartFromStyle(a: string, b: string) {
  return a === b || withStyle(a, {}) === withStyle(b, {})
}

function styleOf(source: string): Style {
  const lines = frontMatter(source)
  return Object.fromEntries(
    STYLE_KEYS.flatMap(key => {
      const value = lines
        .find(l => l.startsWith(`${key}:`))
        ?.slice(key.length + 1)
        .trim()
      return value ? [[key, value]] : []
    }),
  )
}

function withStyle(source: string, style: Style) {
  return STYLE_KEYS.reduce((next, key) => {
    const value = style[key]
    return setFrontMatter(next, key, typeof value === 'string' ? value : undefined)
  }, source)
}

function frontMatter(source: string) {
  const lines = source.split('\n')
  if (lines[0]?.trim() !== '---') return []
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  return end < 0 ? [] : lines.slice(1, end)
}

function read(): Style | null {
  try {
    const value = JSON.parse(localStorage.getItem(STYLE_KEY) || 'null')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null
  } catch {
    return null
  }
}
