// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parsePresentation } from '@/lib/presentation'
import { presentationPdf } from './presentation-pdf'
import { presentationHtml } from './slide/presentation-html'

const presentation = parsePresentation(readFileSync('public/example.md', 'utf8'))

describe('presentationPdf', () => {
  const drawn: { svg: string; args: number[] }[] = []

  beforeEach(() => {
    drawn.length = 0
    vi.stubGlobal('Image', FakeImage)
    const contentDocument = Object.getOwnPropertyDescriptor(
      HTMLIFrameElement.prototype,
      'contentDocument',
    )!.get!
    vi.spyOn(HTMLIFrameElement.prototype, 'contentDocument', 'get').mockImplementation(function (
      this: HTMLIFrameElement,
    ) {
      return Object.assign(contentDocument.call(this)!, { fonts: { ready: Promise.resolve() } })
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          drawImage: (image: FakeImage, ...args: number[]) =>
            drawn.push({ svg: decodeURIComponent(image.src.split(',')[1]), args }),
        }) as unknown as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback =>
      callback(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('writes one full 16:9 page per slide', async () => {
    const pdf = await presentationPdf(await html(), 'Example')
    const text = new TextDecoder('latin1').decode(await pdf.arrayBuffer())
    const count = presentation.slides.length
    expect(text).toContain(`/Count ${count}`)
    expect(text.match(/\/MediaBox \[0 0 960 540\]/g)).toHaveLength(count)
    expect(text.match(/\/Width 5120 \/Height 2880/g)).toHaveLength(count)
    expect(drawn).toHaveLength(count)
    drawn.forEach(({ args }) => expect(args).toEqual([0, 0, 5120, 2880]))
  })

  it('leaves all scaling to the canvas, with no SVG viewBox or zoom', async () => {
    await presentationPdf(await html(), 'Example')
    for (const { svg } of drawn) {
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
      const root = doc.documentElement
      const object = root.querySelector('foreignObject')!
      const slide = object.firstElementChild as HTMLElement
      expect(root.hasAttribute('viewBox')).toBe(false)
      expect(svg).not.toMatch(/zoom:|transform:\s*scale/)
      for (const element of [root, object]) {
        expect(element.getAttribute('width')).toBe(String(cssSize(slide, 'width')))
        expect(element.getAttribute('height')).toBe(String(cssSize(slide, 'height')))
      }
      expect(cssSize(slide, 'width') / cssSize(slide, 'height')).toBeCloseTo(16 / 9)
    }
  })
})

class FakeImage {
  src = ''
  decoding = ''
  decode = () => Promise.resolve()
}

function html() {
  return presentationHtml(presentation, {
    embedImage: async src => src,
    embedFont: async file => `data:font/woff2;base64,${file}`,
  })
}

function cssSize(element: HTMLElement, property: 'width' | 'height') {
  return Number(new RegExp(`${property}:(\\d+)px`).exec(element.getAttribute('style')!)![1])
}
