// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { parsePresentation, presentationLook } from '@/lib/presentation'
import { rememberStyle, sameApartFromStyle, STYLE_KEY, withLastStyle } from '@/lib/last-style'

const STYLED =
  '---\ntitle: Mine\ntheme: studio\ntone: Violet\nscale: hero\nloop: false\n---\n\n# Mine\n'
const BLANK = '---\ntheme: room-dark\n---\n\n# Blank\n'

beforeEach(() => localStorage.clear())

describe('last style', () => {
  it('leaves a presentation alone until a style is chosen', () => {
    expect(withLastStyle(BLANK)).toBe(BLANK)
  })

  it('gives a new presentation the theme, color, font and text size chosen last', () => {
    rememberStyle(STYLED)
    const next = withLastStyle(
      '---\ntitle: New\ntheme: room-light\nfont: archivo-expanded\n---\n\n# New\n',
    )
    const presentation = parsePresentation(next)
    const { theme, tone, title } = presentation
    expect({ theme, tone, title, scale: presentationLook(presentation).scale }).toEqual({
      theme: 'studio',
      tone: '#b9abff',
      title: 'New',
      scale: 'hero',
    })
    expect(next).not.toContain('font:')
    expect(next).not.toContain('loop:')
  })

  it('keeps settings that are not about looks out of the style', () => {
    rememberStyle(STYLED)
    expect(JSON.parse(localStorage.getItem(STYLE_KEY)!)).toEqual({
      theme: 'studio',
      tone: 'Violet',
      scale: 'hero',
    })
  })

  it('adds front matter to a presentation without one', () => {
    rememberStyle(STYLED)
    expect(parsePresentation(withLastStyle('# Plain\n')).theme).toBe('studio')
  })

  it('treats the blank presentation in any style as blank', () => {
    rememberStyle(STYLED)
    expect(sameApartFromStyle(withLastStyle(BLANK), BLANK)).toBe(true)
    expect(sameApartFromStyle('# Other\n', BLANK)).toBe(false)
  })

  it('ignores a broken stored style', () => {
    localStorage.setItem(STYLE_KEY, '[1')
    expect(withLastStyle(BLANK)).toBe(BLANK)
  })
})
