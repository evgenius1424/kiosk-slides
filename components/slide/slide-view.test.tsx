// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Slide, SlideChrome } from '@/lib/deck'
import { SlideView } from '@/components/slide'

afterEach(cleanup)

const chrome: SlideChrome = { title: 'Title', label: 'Label', footer: 'Footer', layout: 'auto', heading: 'Make it ==count==', body: 'Body text.' }
const view = (slide: Slide) => render(<SlideView slide={slide} />).container.querySelector('article')!

describe('SlideView', () => {
  it('renders the chrome, highlighted heading, and body of a message slide', () => {
    const article = view({ ...chrome, kind: 'message' })
    expect(article.className).toContain('kind-message')
    expect(article.querySelector('h2 em')?.textContent).toBe('count')
    expect(article.querySelector('.slide-body')?.textContent).toBe('Body text.')
    expect(article.querySelector('.slide-meta')?.textContent).toContain('Title')
    expect(article.querySelector('.slide-footer')?.textContent).toContain('Footer')
  })

  it('renders numbered steps', () => {
    const article = view({ ...chrome, kind: 'steps', steps: ['Gather', 'Generate', 'Present'] })
    const items = [...article.querySelectorAll('.slide-steps li')].map(li => li.textContent)
    expect(items).toEqual(['01Gather', '02Generate', '03Present'])
  })

  it('renders code with its language', () => {
    const article = view({ ...chrome, kind: 'code', language: 'html', code: '<h1>Hi</h1>' })
    expect(article.className).toContain('kind-code')
    expect(article.querySelector('.code-frame pre code')?.textContent).toBe('<h1>Hi</h1>')
    expect(article.querySelector('.code-frame > div')?.textContent).toContain('html')
  })

  it('renders an image with its caption', () => {
    const article = view({ ...chrome, kind: 'image', src: 'https://example.com/a.png', alt: 'A screen', caption: 'From the back' })
    const img = article.querySelector('.slide-image img')!
    expect(img.getAttribute('src')).toBe('https://example.com/a.png')
    expect(img.getAttribute('alt')).toBe('A screen')
    expect(article.querySelector('.slide-image figcaption')?.textContent).toBe('From the back')
  })
})

describe('SlideView: flow', () => {
  const flow = (lines: string[][]) => {
    const article = view({ ...chrome, kind: 'flow', lines })
    return {
      boxes: [...article.querySelectorAll('.slide-flow .flow-box')].map(box => box.textContent),
      arrows: article.querySelectorAll('.slide-flow .flow-arrow').length,
    }
  }

  it('draws a single chain as boxes joined by arrows', () => {
    expect(flow([['Write', 'Parse', 'Present']])).toEqual({ boxes: ['Write', 'Parse', 'Present'], arrows: 2 })
  })

  it('merges identical box text into one box where two chains converge', () => {
    expect(flow([['Notes', 'Draft', 'Deck'], ['Data', 'Deck']])).toEqual({ boxes: ['Notes', 'Draft', 'Deck', 'Data'], arrows: 3 })
  })

  it('draws chains that share no text as parallel lines', () => {
    expect(flow([['Plan', 'Build'], ['Test', 'Ship']])).toEqual({ boxes: ['Plan', 'Build', 'Test', 'Ship'], arrows: 2 })
  })
})
