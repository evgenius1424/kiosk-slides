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

/** Return `source` with its front-matter `theme:` set to `theme`, adding the line or the front matter if missing. */
export function setDeckTheme(source: string, theme: Theme): string {
  const lines = source.split('\n')
  const end = lines[0]?.trim() === '---' ? lines.findIndex((l, i) => i > 0 && l.trim() === '---') : -1
  if (end < 0) return `---\ntheme: ${theme}\n---\n\n${source}`
  const themeIndex = lines.findIndex((l, i) => i > 0 && i < end && /^theme:/.test(l))
  if (themeIndex > 0) lines[themeIndex] = `theme: ${theme}`
  else lines.splice(end, 0, `theme: ${theme}`)
  return lines.join('\n')
}
