import { describe, expect, it } from 'vitest'
import { slideColors } from './palette'
import { themes, tones } from './theme'

const LARGE_TEXT = 3
const GLOW_PEAK = 0.16

describe('tones', () => {
  it.each(themes)('stand out at 3:1 as heading highlight and accent on the %s theme', theme => {
    const ratios = tones.flatMap(({ name, colors }) => {
      const tone = rgb(colors[theme])
      const palette = slideColors(colors[theme], theme)
      return [palette['--slide-bg'], palette['--slide-surface']].flatMap(surface => {
        const flat = rgb(surface)
        const glow = mix(tone, flat, GLOW_PEAK)
        return [flat, glow].map(back => ({ name, ratio: contrast(tone, back) }))
      })
    })
    expect(ratios.filter(r => r.ratio < LARGE_TEXT)).toEqual([])
  })

  it.each(themes)('keep body and muted text readable on the %s theme', theme => {
    const ratios = tones.flatMap(({ name, colors }) => {
      const palette = slideColors(colors[theme], theme)
      const back = rgb(palette['--slide-bg'])
      return [
        { name, text: 'text', ratio: contrast(rgb(palette['--slide-text']), back) },
        { name, text: 'muted', ratio: contrast(rgb(palette['--slide-muted']), back) },
      ]
    })
    expect(ratios.filter(r => r.ratio < 4.5)).toEqual([])
  })
})

describe('slideColors', () => {
  it('keeps Mono grays free of any hue', () => {
    for (const theme of themes) {
      const palette = slideColors(tones[0].colors[theme], theme)
      for (const color of Object.values(palette)) {
        const [r, g, b] = rgb(color)
        expect(Math.max(r, g, b) - Math.min(r, g, b)).toBe(0)
      }
    }
  })

  it('tints grays toward the color and keeps Studio black', () => {
    const coral = slideColors('#ff8577', 'room-dark')
    const [r, , b] = rgb(coral['--slide-bg'])
    expect(r).toBeGreaterThan(b)
    expect(slideColors('#ff8577', 'studio')['--slide-bg']).toBe('#000000')
  })

  it('treats a custom gray or an unreadable color as Mono', () => {
    expect(slideColors('#777', 'room-light')['--slide-bg']).toBe(
      slideColors('#000000', 'room-light')['--slide-bg'],
    )
    expect(slideColors('red', 'room-dark')['--slide-bg']).toBe('#121212')
  })
})

type Rgb = [number, number, number]

function rgb(hex: string): Rgb {
  const full = hex.length === 4 ? hex.replace(/\w/g, c => c + c) : hex
  return [1, 3, 5].map(i => parseInt(full.slice(i, i + 2), 16) / 255) as Rgb
}

function mix(a: Rgb, b: Rgb, amount: number) {
  return a.map((v, i) => v * amount + b[i] * (1 - amount)) as Rgb
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
