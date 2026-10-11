import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseDeck } from '@/lib/deck'
import { slideStyles } from '@/lib/slide-styles'
import { deckHtml } from './deck-html'

const deck = parseDeck(readFileSync('public/example.md', 'utf8'))
const render = (motion = true) => deckHtml(deck, { tone: '#669a98', motion, embedImage: async src => `data:image/png;base64,${src.length}` })

describe('deckHtml', () => {
  it('renders every slide into one self-contained page', async () => {
    const html = await render()
    expect(html.match(/class="portable-slide"/g)).toHaveLength(deck.slides.length)
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

  it('ships touch controls and swipe navigation', async () => {
    const html = await render()
    expect(html).toContain('aria-label="Previous slide"')
    expect(html).toContain('aria-label="Next slide"')
    expect(html).toContain("addEventListener('touchend'")
  })
})
