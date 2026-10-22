import { describe, expect, it } from 'vitest'
import { fonts, headingSize, type HeadingPart } from '@/lib/presentation'

const slide = (text: string, body = '') => ({
  kind: 'message' as const,
  body,
  heading: [{ text }] as HeadingPart[],
})

const table = (text: string, rows: number) => ({
  kind: 'table' as const,
  body: '',
  heading: [{ text }] as HeadingPart[],
  header: ['Flour', 'Character'],
  rows: Array.from({ length: rows }, () => ['Chickpea', 'Savory, protein-rich']),
})

describe('headingSize', () => {
  it('leaves normal scale to the stylesheet', () => {
    expect(headingSize(slide('Ship'), { scale: 'normal', font: 'inter' })).toBeUndefined()
  })

  it('makes a one-word kiosk heading huge and a long one smaller', () => {
    const short = headingSize(slide('Ship'), { scale: 'hero', font: 'inter' })!
    const long = headingSize(
      slide(
        'Make your point impossible to miss from the very back of a crowded room, every single time',
      ),
      { scale: 'hero', font: 'inter' },
    )!
    expect(short).toBe(16)
    expect(long).toBeLessThan(short)
    expect(long).toBeGreaterThanOrEqual(5)
  })

  it('leaves room for the body', () => {
    const text = 'Short talks hold attention'
    const alone = headingSize(slide(text), { scale: 'hero', font: 'inter' })!
    expect(
      headingSize(slide(text, 'x '.repeat(150)), { scale: 'hero', font: 'inter' }),
    ).toBeLessThan(alone)
  })

  it('keeps widget headings modest and wider fonts smaller', () => {
    const steps = { ...slide('Three steps'), kind: 'steps' as const, steps: ['Write', 'Review'] }
    expect(headingSize(steps, { scale: 'hero', font: 'inter' })).toBe(11)
    const text = 'Two inputs become one confident presentation for everyone'
    expect(headingSize(slide(text), { scale: 'hero', font: 'archivo-expanded' })).toBeLessThan(
      headingSize(slide(text), { scale: 'hero', font: 'inter' })!,
    )
  })
  it('shrinks a widget heading until the widget fits below it', () => {
    const text = 'Not every flour comes from wheat'
    const hero = { scale: 'hero', font: 'inter' } as const
    const short = headingSize(table(text, 2), hero)!
    const tall = headingSize(table(text, 5), hero)!
    expect(tall).toBeLessThan(short)
    expect(tall).toBeGreaterThanOrEqual(6)
    expect(headingSize(table(text, 6), { scale: 'large', font: 'inter' })).toBe(5)
  })

  it('measures a mostly Cyrillic heading with the Cyrillic face', () => {
    const latin = 'Two inputs become one confident presentation for everyone'
    const russian = 'Два источника становятся одной уверенной презентацией для всех'
    for (const font of fonts.map(f => f.id)) {
      expect(headingSize(slide(russian), { scale: 'hero', font })).toBeLessThanOrEqual(
        headingSize(slide(latin), { scale: 'hero', font })!,
      )
    }
  })

  it('gives every bundled font a Cyrillic face', () => {
    for (const font of fonts.filter(f => f.files.length))
      expect(font.files.some(f => f.script === 'cyrillic')).toBe(true)
  })
})
