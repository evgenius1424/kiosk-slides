// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { cleanup, render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { KioskWorkspace } from '@/components/kiosk-workspace'
import { parsePresentation, setFrontMatter, tones } from '@/lib/presentation'
import { DEFAULT_TRANSITION } from '@/lib/player'
import messages from '@/messages/en.json'
import { presentationHtml } from './presentation-html'

const example = Object.entries({
  theme: 'room-light',
  font: 'figtree',
  scale: 'kiosk',
  brand: 'Acme',
}).reduce(
  (source, [key, value]) => setFrontMatter(source, key, value),
  readFileSync('public/example.md', 'utf8'),
)
const presentation = parsePresentation(example)

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  vi.stubGlobal('fetch', () => new Promise(() => {}))
  HTMLDialogElement.prototype.close = () => {}
})
afterEach(cleanup)

describe('site preview and exported presentation', () => {
  it('render the same slide markup', async () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <KioskWorkspace example={example} prompt="" />
      </NextIntlClientProvider>,
    )
    const exported = await exportedSlides()
    const preview = markup(container.querySelector('.canvas-slide article')!)
    const thumbnails = [...container.querySelectorAll('.thumbnail article')].map(a =>
      markup(a).replace(' miniature', ' '),
    )
    expect(exported).toHaveLength(presentation.slides.length)
    expect(preview).toBe(exported[0])
    expect(thumbnails).toEqual(exported)
  })
})

async function exportedSlides() {
  const html = await presentationHtml(presentation, {
    tone: tones[0].color,
    transition: DEFAULT_TRANSITION,
    embedImage: async src => src,
    embedFont: async file => file,
  })
  const page = new DOMParser().parseFromString(html, 'text/html')
  return [...page.querySelectorAll('.portable-slide article')].map(markup)
}

function markup(article: Element) {
  for (const el of [article, ...article.querySelectorAll('*')]) {
    const style = (el as HTMLElement).style?.cssText
    const attributes = [...el.attributes].sort((a, b) => a.name.localeCompare(b.name))
    attributes.forEach(a => el.removeAttribute(a.name))
    attributes.forEach(a => el.setAttribute(a.name, a.name === 'style' ? style : a.value))
  }
  return article.outerHTML
}
