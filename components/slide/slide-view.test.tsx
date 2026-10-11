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

  const chartData = { labels: ['Jan', 'Feb', 'Mar'], series: [{ name: 'Visits', values: [120, 300, 80] }, { name: 'Signups', values: [8, 12, 0] }] }

  it('renders a bar chart with one bar per value, its labels, and a legend', () => {
    const article = view({ ...chrome, kind: 'chart', type: 'bar', ...chartData })
    expect(article.className).toContain('kind-chart')
    expect(article.querySelectorAll('.slide-chart svg .chart-bar')).toHaveLength(6)
    expect([...article.querySelectorAll('.slide-chart .chart-label')].map(l => l.textContent)).toEqual(['Jan', 'Feb', 'Mar'])
    expect([...article.querySelectorAll('.slide-chart .chart-legend li')].map(l => l.textContent)).toEqual(['Visits', 'Signups'])
  })

  it('renders a line chart with one line per series and one point per value', () => {
    const article = view({ ...chrome, kind: 'chart', type: 'line', ...chartData })
    expect(article.querySelectorAll('.slide-chart svg .chart-line')).toHaveLength(2)
    expect(article.querySelectorAll('.slide-chart svg .chart-point')).toHaveLength(6)
    expect(article.querySelectorAll('.slide-chart svg .chart-bar')).toHaveLength(0)
  })

  it('renders a metric value with its caption', () => {
    const article = view({ ...chrome, kind: 'metric', value: '3x', caption: 'more questions answered' })
    expect(article.className).toContain('kind-metric')
    expect(article.querySelector('.slide-metric strong')?.textContent).toBe('3x')
    expect(article.querySelector('.slide-metric > span')?.textContent).toBe('more questions answered')
  })
})

describe('SlideView: buttons', () => {
  it('renders one external link button per entry', () => {
    const article = view({ ...chrome, kind: 'buttons', buttons: [
      { label: 'View the repo', url: 'https://github.com/example/repo' },
      { label: 'See the product', url: 'https://example.com' },
    ] })
    const links = [...article.querySelectorAll('.slide-buttons a')]
    expect(links.map(a => [a.textContent, a.getAttribute('href')])).toEqual([
      ['View the repo', 'https://github.com/example/repo'],
      ['See the product', 'https://example.com'],
    ])
    for (const a of links) {
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toContain('noopener')
    }
  })
})

describe('SlideView: table and before/after', () => {
  it('renders a table with a header row and one row per body row', () => {
    const article = view({ ...chrome, kind: 'table', header: ['Task', 'Hours', 'Owner'], rows: [['Write', '3', 'Ana'], ['Review', '1', 'Bo']] })
    expect(article.className).toContain('kind-table')
    const table = article.querySelector('table.slide-table')!
    expect([...table.querySelectorAll('thead th')].map(th => th.textContent)).toEqual(['Task', 'Hours', 'Owner'])
    const rows = [...table.querySelectorAll('tbody tr')]
    expect(rows).toHaveLength(2)
    expect(rows.map(tr => tr.querySelectorAll('td').length)).toEqual([3, 3])
    expect(rows[1].textContent).toBe('Review1Bo')
  })

  it('renders before and after side by side', () => {
    const article = view({ ...chrome, kind: 'before-after', before: 'Dense slides', after: 'One idea' })
    const sections = [...article.querySelectorAll('.comparison section')]
    expect(sections.map(s => [s.querySelector('.widget-label')?.textContent, s.querySelector('p')?.textContent]))
      .toEqual([['Before', 'Dense slides'], ['After', 'One idea']])
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
