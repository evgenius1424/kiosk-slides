import { describe, expect, it } from 'vitest'
import { slideStyles } from '@/lib/slide-styles'
import { fonts } from './look'
import { slideColors } from './palette'
import { pillThemes, themes, toneInk, tones } from './theme'

const LARGE_TEXT = 3
const TEXT = 4.5
const GLOW_PEAK = 0.16

describe('tones', () => {
  it.each(themes.filter(t => !pillThemes.includes(t)))(
    'stand out at 3:1 as heading highlight and accent on the %s theme',
    theme => {
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
    },
  )

  it.each(pillThemes)('carry readable text on every tone on the %s theme', theme => {
    const ratios = tones.map(({ name, colors }) => ({
      name,
      ratio: contrast(rgb(toneInk(colors[theme])), rgb(colors[theme])),
    }))
    expect(ratios.filter(r => r.ratio < TEXT)).toEqual([])
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
    expect(ratios.filter(r => r.ratio < TEXT)).toEqual([])
  })
})

describe('slideColors', () => {
  it('keeps Mono grays free of any hue', () => {
    for (const theme of themes.filter(t => t !== 'paper')) {
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

  it('keeps Paper warm and fills Poster with the color', () => {
    expect(slideColors('#5e45cd', 'paper')['--slide-bg']).toBe(
      slideColors('#0a7463', 'paper')['--slide-bg'],
    )
    const poster = slideColors('#fd6844', 'poster')
    expect(poster['--slide-bg']).toBe('#fd6844')
    expect(poster['--slide-text']).toBe('#111111')
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

  it('treats a custom gray or an unreadable color as Mono', () => {
    expect(slideColors('#777', 'room-light')['--slide-bg']).toBe(
      slideColors('#000000', 'room-light')['--slide-bg'],
    )
    expect(slideColors('red', 'room-dark')['--slide-bg']).toBe('#121212')
  })
})

describe('pill highlights', () => {
  it.each(fonts.map(f => f.id))('fit the letters of the %s font', id => {
    expect(slideStyles).toContain(`.slide.font-${id}{--pill-top:`)
    expect(slideStyles).toContain(`.slide.font-${id}.pill-tall{--pill-top:`)
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
