import { toneInk, type Theme } from './theme'

export const slideColors = (tone: string, theme: Theme) => {
  const ink = toneInk(tone)
  if (theme === 'poster') return posterColors(tone, ink)
  const hue = theme === 'paper' ? PAPER_HUE : toneHue(tone)
  const gray = (role: Role) => {
    const [lightness, chroma] = GRAYS[theme][role]
    return hue === undefined ? oklchHex(lightness, 0, 0) : oklchHex(lightness, chroma, hue)
  }
  return {
    '--slide-tone': tone,
    '--slide-bg': theme === 'studio' ? '#000000' : gray('bg'),
    '--slide-surface': gray('surface'),
    '--slide-line': gray('line'),
    '--slide-muted': gray('muted'),
    '--slide-text': gray('text'),
    '--slide-ink': ink,
  }
}

type Role = 'bg' | 'surface' | 'line' | 'muted' | 'text'

const GRAYS: Record<Exclude<Theme, 'poster'>, Record<Role, [number, number]>> = {
  'room-dark': {
    bg: [0.183, 0.006],
    surface: [0.262, 0.01],
    line: [0.37, 0.014],
    muted: [0.773, 0.016],
    text: [0.985, 0.003],
  },
  'room-light': {
    bg: [0.985, 0],
    surface: [0.956, 0.006],
    line: [0.871, 0.01],
    muted: [0.442, 0.02],
    text: [0.21, 0.01],
  },
  studio: {
    bg: [0, 0],
    surface: [0.192, 0.008],
    line: [0.295, 0.012],
    muted: [0.652, 0.014],
    text: [1, 0],
  },
  paper: {
    bg: [0.945, 0.016],
    surface: [0.915, 0.02],
    line: [0.82, 0.03],
    muted: [0.47, 0.03],
    text: [0.23, 0.015],
  },
  marker: {
    bg: [0.972, 0],
    surface: [0.935, 0.006],
    line: [0.87, 0.01],
    muted: [0.44, 0.02],
    text: [0.2, 0.01],
  },
}

const PAPER_HUE = (80 / 180) * Math.PI

const NEUTRAL_CHROMA = 0.03

function posterColors(tone: string, ink: string) {
  const back = parseHex(tone) ?? [1, 1, 1]
  const front = parseHex(ink)!
  return {
    '--slide-tone': tone,
    '--slide-bg': tone,
    '--slide-surface': mixHex(front, back, 0.1),
    '--slide-line': ink,
    '--slide-muted': mixHex(front, back, 0.8),
    '--slide-text': ink,
    '--slide-ink': ink,
  }
}

function mixHex(front: Rgb, back: Rgb, amount: number) {
  return hex(front.map((c, i) => c * amount + back[i] * (1 - amount)) as Rgb)
}

function toneHue(tone: string) {
  const rgb = parseHex(tone)
  if (!rgb) return undefined
  const [, a, b] = linearToOklab(rgb.map(toLinear) as Rgb)
  if (Math.hypot(a, b) < NEUTRAL_CHROMA) return undefined
  return Math.atan2(b, a)
}

type Rgb = [number, number, number]

function parseHex(color: string): Rgb | undefined {
  const hex = color.trim().replace(/^#/, '')
  if (!/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return undefined
  const full =
    hex.length <= 4
      ? hex
          .slice(0, 3)
          .split('')
          .map(c => c + c)
          .join('')
      : hex.slice(0, 6)
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255) as Rgb
}

function oklchHex(lightness: number, chroma: number, hue: number) {
  const rgb = oklabToLinear(lightness, chroma * Math.cos(hue), chroma * Math.sin(hue))
  return hex(rgb.map(c => fromLinear(Math.min(1, Math.max(0, c)))) as Rgb)
}

function hex(rgb: Rgb) {
  return `#${rgb
    .map(c => Math.round(c * 255))
    .map(c => c.toString(16).padStart(2, '0'))
    .join('')}`
}

function toLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function fromLinear(c: number) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
}

function linearToOklab([r, g, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function oklabToLinear(lightness: number, a: number, b: number): Rgb {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}
