import { describe, expect, it } from 'vitest'
import { fonts, headingSize, type HeadingPart } from '@/lib/presentation'

const slide = (text: string, kind: 'message' | 'steps' = 'message', body = '') => ({
  kind,
  body,
  heading: [{ text }] as HeadingPart[],
})

describe('headingSize', () => {
  it('leaves normal scale to the stylesheet', () => {
    expect(headingSize(slide('Ship'), { scale: 'normal', font: 'inter' })).toBeUndefined()
  })

  it('makes a one-word kiosk heading huge and a long one smaller', () => {
    const short = headingSize(slide('Ship'), { scale: 'kiosk', font: 'inter' })!
    const long = headingSize(
      slide(
        'Make your point impossible to miss from the very back of a crowded room, every single time',
      ),
      { scale: 'kiosk', font: 'inter' },
    )!
    expect(short).toBe(16)
    expect(long).toBeLessThan(short)
    expect(long).toBeGreaterThanOrEqual(5)
  })

  it('leaves room for the body', () => {
    const text = 'Short talks hold attention'
    const alone = headingSize(slide(text), { scale: 'kiosk', font: 'inter' })!
    expect(
      headingSize(slide(text, 'message', 'x '.repeat(150)), { scale: 'kiosk', font: 'inter' }),
    ).toBeLessThan(alone)
  })

  it('keeps widget headings modest and wider fonts smaller', () => {
    expect(headingSize(slide('Three steps', 'steps'), { scale: 'kiosk', font: 'inter' })).toBe(7)
    const text = 'Two inputs become one confident presentation for everyone'
    expect(headingSize(slide(text), { scale: 'kiosk', font: 'archivo-expanded' })).toBeLessThan(
      headingSize(slide(text), { scale: 'kiosk', font: 'inter' })!,
    )
  })
  it('measures a mostly Cyrillic heading with the Cyrillic face', () => {
    const latin = 'Two inputs become one confident presentation for everyone'
    const russian = 'Два источника становятся одной уверенной презентацией для всех'
    for (const font of fonts.map(f => f.id)) {
      expect(headingSize(slide(russian), { scale: 'kiosk', font })).toBeLessThanOrEqual(
        headingSize(slide(latin), { scale: 'kiosk', font })!,
      )
    }
  })

  it('gives every bundled font a Cyrillic face', () => {
    for (const font of fonts.filter(f => f.files.length))
      expect(font.files.some(f => f.script === 'cyrillic')).toBe(true)
  })
})
