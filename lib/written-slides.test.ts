import { describe, expect, it } from 'vitest'
import { parsePresentation } from './presentation'
import { slideChanges, writingSlides, writtenSource } from './written-slides'

describe('writtenSource', () => {
  it('keeps only slides followed by a separator', () => {
    expect(writtenSource('# One\n\n---\n\n# Tw')).toBe('# One\n')
    expect(writtenSource('# One\n\n---\n\n# Two\n\n---\n')).toBe('# One\n\n---\n\n# Two\n')
  })

  it('waits for the front matter and a first slide', () => {
    expect(writtenSource('---\ntitle: Four days\n')).toBe('')
    expect(writtenSource('---\ntitle: Four days\n---\n\n# One')).toBe('')
    expect(writtenSource('\n---\ntitle: Four days\n---\n\n# One\n\n---\n')).toBe(
      '---\ntitle: Four days\n---\n\n# One\n',
    )
  })

  it('ignores separators inside a code block', () => {
    expect(writtenSource('# One\n\n```\n---\n')).toBe('')
  })

  it('takes everything once the reply is done', () => {
    expect(writtenSource('# One\n\n---\n\n# Two\n', true)).toBe('# One\n\n---\n\n# Two')
  })
})

describe('slide changes', () => {
  const slides = (source: string) => parsePresentation(source).slides

  it('lists slides not written yet after the last one matched', () => {
    const before = slides('# One\n\n---\n\n# Two\n\n---\n\n# Three')
    const { marks } = writingSlides(before, slides('# One\n\n---\n\n# Two, **new**'))
    expect(marks).toEqual([undefined, 'changed', 'waiting'])
  })

  it('counts slides moved without changes as unchanged', () => {
    const before = slides('# One\n\n---\n\n# Two\n\n---\n\n# Three')
    const after = slides('# Two\n\n---\n\n# One\n\n---\n\n# Three')
    expect(slideChanges(before, after)).toEqual({ changed: 0, added: 0, removed: 0 })
  })
})
