import { describe, expect, it } from 'vitest'
import {
  fonts,
  headingSize,
  scales,
  tableSize,
  textFit,
  type HeadingPart,
} from '@/lib/presentation'

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
  it('leaves room for the gaps around a pill highlight', () => {
    const highlighted = {
      ...slide(''),
      heading: [
        { text: 'Make ' },
        { text: 'Ship', highlight: true },
        { text: ' count' },
      ] as HeadingPart[],
    }
    const hero = { scale: 'hero', font: 'inter' } as const
    expect(headingSize(highlighted, { ...hero, pill: true })).toBeLessThan(
      headingSize(highlighted, hero)!,
    )
  })

  it('shrinks a widget heading until the widget fits below it', () => {
    const text = 'Not every flour comes from wheat'
    const hero = { scale: 'hero', font: 'inter' } as const
    const short = headingSize(table(text, 2), hero)!
    const tall = headingSize(table(text, 5), hero)!
    expect(tall).toBeLessThan(short)
    expect(tall).toBeGreaterThanOrEqual(5.5)
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

describe('tableSize', () => {
  const text = 'Not every flour comes from wheat'

  it('keeps a small table at full size', () => {
    for (const scale of scales)
      expect(tableSize(table(text, 3), { scale, font: 'inter' })).toBeUndefined()
  })

  it('shrinks a tall table so it clears the footer', () => {
    const normal = { scale: 'normal', font: 'inter' } as const
    const six = tableSize(table(text, 6), normal)!
    expect(six).toBeLessThan(2)
    expect(tableSize({ ...table(text, 6), body: 'x '.repeat(80) }, normal)).toBeLessThan(six)
    expect(
      tableSize(table(text, 6), { scale: 'normal', font: 'archivo-expanded' }),
    ).toBeLessThanOrEqual(six)
  })

  it('never goes below a readable size', () => {
    const long = { ...table(text, 6), body: 'x '.repeat(150) }
    expect(tableSize(long, { scale: 'normal', font: 'archivo-expanded' })).toBe(1.3)
  })
})

describe('textFit', () => {
  const bullets = (heading: string, body: string, items: string[]) => ({
    kind: 'bullets' as const,
    body,
    heading: [{ text: heading }] as HeadingPart[],
    items,
  })
  const russian = bullets(
    'Нюша: если мной не восхищаются, существую ли я?',
    'Её мечты о красоте, романтике и статусе легко принять за поверхностность.\n\nНо под ними можно увидеть болезненную зависимость самооценки от чужого взгляда.',
    [
      'Хочет быть исключительной, а не просто принятой.',
      'Романтизирует отношения ещё до их начала.',
      'Сравнивает себя с воображаемым идеалом.',
      'Скрывает уязвимость за требовательностью.',
    ],
  )
  const english = bullets(
    'Nyusha: if nobody admires me, do I even exist?',
    'Her dreams of beauty, romance and status are easy to mistake for shallowness.\n\nBut underneath you can see a painful dependence of self-worth on how others see her.',
    [
      'Wants to be exceptional, not merely accepted.',
      'Romanticizes relationships before they even begin.',
      'Compares herself with an imagined ideal.',
      'Hides vulnerability behind being demanding.',
    ],
  )

  it('keeps text that fits at full size', () => {
    for (const scale of scales)
      expect(
        textFit(bullets('Ship it', 'One line.', ['Write', 'Review']), { scale, font: 'inter' }),
      ).toBeUndefined()
  })

  it('shrinks body and widget text when the heading is already at its smallest', () => {
    for (const scale of scales)
      for (const font of fonts.map(f => f.id)) {
        const latin = textFit(english, { scale, font })!
        expect(latin).toBeLessThan(1)
        expect(textFit(russian, { scale, font })).toBeLessThanOrEqual(latin)
      }
  })

  it('measures a Latin heading over Cyrillic text with the Cyrillic face', () => {
    const mixed = { ...russian, heading: english.heading }
    expect(textFit(mixed, { scale: 'normal', font: 'archivo-expanded' })).toBeLessThan(
      textFit(english, { scale: 'normal', font: 'archivo-expanded' })!,
    )
  })

  it('never goes below a readable size', () => {
    const long = { ...russian, body: russian.body.repeat(4) }
    expect(textFit(long, { scale: 'hero', font: 'archivo-expanded' })).toBe(0.6)
  })

  it('leaves slides with nothing to shrink alone', () => {
    const image = {
      ...slide('Show it, do not describe it'),
      kind: 'image' as const,
      src: 'a.png',
      caption: '',
      alt: '',
    }
    expect(textFit(image, { scale: 'normal', font: 'inter' })).toBeUndefined()
  })
})
