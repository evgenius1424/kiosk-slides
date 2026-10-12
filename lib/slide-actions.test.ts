import { describe, expect, it } from 'vitest'
import { SLIDE_ACTIONS, extractSlides, slideCopyRequest, slideRequest } from '@/lib/slide-actions'

const source = '---\ntitle: T\n---\n\n# One\n\nWordy text.\n\n---\n\n# Two\n'

describe('slide-mode prompt', () => {
  it('sends the whole presentation, the one slide and what to do', () => {
    const request = slideRequest('shorter', source, 1)
    expect(request).toContain(`<presentation>\n${source.trim()}\n</presentation>`)
    expect(request).toContain('slide 2:\n<slide>\n# Two\n</slide>')
    expect(request).toMatch(/fewer words, same point/)
  })

  it('gives every action its own instruction', () => {
    const texts = SLIDE_ACTIONS.map(action => slideRequest(action, source, 0).split('</slide>')[1])
    expect(new Set(texts).size).toBe(SLIDE_ACTIONS.length)
    expect(slideRequest('split', source, 0)).toContain('exactly two slides')
  })

  it('puts the copy guide in front for any AI chat', () => {
    expect(slideCopyRequest('GUIDE', 'visual', source, 0)).toBe(
      `GUIDE\n\n${slideRequest('visual', source, 0)}`,
    )
  })
})

describe('reading the new slide', () => {
  it('takes what is inside the slides tags', () => {
    expect(extractSlides('Here you go.\n<slides>\n# Short\n</slides>\nDone.')).toBe('# Short')
  })

  it('takes a markdown code block out of a chat answer, keeping code inside it', () => {
    const answer = 'Sure:\n\n```markdown\n# Code\n\n```html\n<p>Hi</p>\n```\n```\n\nEnjoy.'
    expect(extractSlides(answer)).toBe('# Code\n\n```html\n<p>Hi</p>\n```')
  })

  it('keeps a pasted slide as it is, dropping stray separators at the ends', () => {
    expect(extractSlides('---\n\n# A\n\n---\n\n# B\n\n---\n')).toBe('# A\n\n---\n\n# B')
    expect(extractSlides('# A\n\n```js\nx\n```')).toBe('# A\n\n```js\nx\n```')
  })
})
