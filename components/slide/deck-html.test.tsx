import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseDeck } from '@/lib/deck'
import { slideStyles } from '@/lib/slide-styles'
import { deckHtml } from './deck-html'

const deck = parseDeck(readFileSync('public/example.md', 'utf8'))
const render = (motion = true) => deckHtml(deck, { tone: '#669a98', motion, embedImage: async src => `data:image/png;base64,${src.length}`, embedFont: async file => `data:font/woff2;base64,${file}` })

describe('deckHtml', () => {
  it('renders every slide into one self-contained page', async () => {
    const html = await render()
    expect(html.match(/class="portable-slide /g)).toHaveLength(deck.slides.length)
    expect(html).toContain(slideStyles)
    expect(html).toContain('--slide-tone:#669a98')
    expect(html).toContain(`<title>${deck.title}</title>`)
  })

  it('embeds images through the given function', async () => {
    const html = await render()
    expect(html).toContain('src="data:image/png;base64,')
    expect(html).not.toContain('src="/images/')
  })

  it('turns the transition off without motion', async () => {
    expect(await render(true)).toContain('animation:slide-enter')
    expect(await render(false)).toContain('.portable-slide.active .slide{animation:none}')
  })

  it('ships swipe navigation and a full-screen toggle without pagination', async () => {
    const html = await render()
    expect(html).toContain("addEventListener('touchend'")
    expect(html).toContain('aria-label="Toggle full screen"')
    expect(html).not.toContain('aria-label="Next slide"')
  })

  it('fills the space around a centered slide with the slide background', async () => {
    const html = await render()
    expect(html).toContain('class="portable-slide slide-backdrop room-dark"')
    expect(html).toContain('viewport-fit=cover')
  })

  it('embeds only the chosen font', async () => {
    const html = await deckHtml({ ...deck, font: 'figtree' }, { tone: '#669a98', motion: true, embedImage: async src => src, embedFont: async file => `data:font/woff2;base64,${file}` })
    expect(html).toContain("@font-face{font-family:'Figtree';src:url(data:font/woff2;base64,figtree.woff2)")
    expect(html).not.toContain("font-family:'Inter'")
    expect(await render()).not.toContain('@font-face')
  })
})
