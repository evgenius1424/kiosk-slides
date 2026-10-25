import { describe, expect, it } from 'vitest'
import { slideStyles } from '@/lib/slide-styles'
import { fonts } from './look'
import { pillThemes, themes, toneInk, tones, type Theme } from './theme'

const LARGE_TEXT = 3
const TEXT = 4.5

describe('tones', () => {
  it.each(themes.filter(t => !pillThemes.includes(t)))(
    'stand out at 3:1 as heading highlight and accent on the %s theme',
    theme => {
      const { mix, surfaces } = themeColors(theme)
      const ratios = tones.flatMap(({ name, colors }) => {
        const tone = rgb(colors[theme])
        const highlight = mixOklab(tone, mix.with, mix.amount)
        return surfaces.flatMap(surface => {
          const flat = mixSrgb(surface, tone, 0.95)
          const corner = mixSrgb(tone, flat, 0.16)
          return [flat, corner].map(back => ({ name, ratio: contrast(highlight, back) }))
        })
      })
      expect(ratios.filter(r => r.ratio < LARGE_TEXT)).toEqual([])
    },
  )

  it.each(pillThemes)('carry readable text on every tone on the %s theme', theme => {
    const ratios = tones.map(({ name, colors }) => ({
      name,
      ratio: contrast(rgb(toneInk(colors[theme])), rgb(colors[theme])),
    }))
    expect(ratios.filter(r => r.ratio < TEXT)).toEqual([])
  })

  it('picks black or white text for any color', () => {
    expect(['#ffd23f', '#ffffff', '#2fd4a7', '#1f4fd8', '#000'].map(toneInk)).toEqual([
      '#111111',
      '#111111',
      '#111111',
      '#ffffff',
      '#ffffff',
    ])
  })
})

describe('pill highlights', () => {
  it.each(fonts.map(f => f.id))('sit on the letters in the %s font', id => {
    expect(slideStyles).toContain(`.slide.font-${id}{--pill-shift:`)
  })
})
type Rgb = [number, number, number]

function themeColors(theme: Theme) {
  const base = /\.slide\{([^}]*)\}/.exec(slideStyles)![1]
  const own = new RegExp(`\\.slide\\.${theme}\\{([^}]*)\\}`).exec(slideStyles)?.[1] ?? ''
  const value = (name: string) =>
    new RegExp(`--slide-${name}:([^;]+)`).exec(own)?.[1] ??
    new RegExp(`--slide-${name}:([^;]+)`).exec(base)![1]
  const [, amount, other] = /var\(--slide-tone\) (\d+)%,(#\w+)/.exec(value('highlight'))!
  return {
    mix: { with: rgb(other), amount: Number(amount) / 100 },
    surfaces: [rgb(value('bg')), rgb(value('surface'))],
  }
}

function rgb(hex: string): Rgb {
  const full = hex.length === 4 ? hex.replace(/\w/g, c => c + c) : hex
  return [1, 3, 5].map(i => parseInt(full.slice(i, i + 2), 16) / 255) as Rgb
}

function mixSrgb(a: Rgb, b: Rgb, amount: number) {
  return a.map((v, i) => v * amount + b[i] * (1 - amount)) as Rgb
}

function mixOklab(a: Rgb, b: Rgb, amount: number) {
  const [x, y] = [toOklab(a), toOklab(b)]
  return fromOklab(x.map((v, i) => v * amount + y[i] * (1 - amount)) as Rgb)
}

function contrast(a: Rgb, b: Rgb) {
  const [light, dark] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (light + 0.05) / (dark + 0.05)
}

function luminance(color: Rgb) {
  const [r, g, b] = color.map(linear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function linear(c: number) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function gamma(c: number) {
  return Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055))
}

function toOklab(color: Rgb): Rgb {
  const [r, g, b] = color.map(linear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function fromOklab([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}
