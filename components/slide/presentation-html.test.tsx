import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parsePresentation } from '@/lib/presentation'
import { slideStyles } from '@/lib/slide-styles'
import type { Transition } from '@/lib/player'
import { presentationHtml } from './presentation-html'

const presentation = parsePresentation(readFileSync('public/example.md', 'utf8'))
const render = (transition: Transition = 'gentle', shareSafe = false) =>
  presentationHtml(presentation, {
    tone: '#669a98',
    transition,
    shareSafe,
    embedImage: async src => `data:image/png;base64,${src.length}`,
    embedFont: async file => `data:font/woff2;base64,${file}`,
  })

const renderFont = (source: typeof presentation, font: string) =>
  presentationHtml(
    { ...source, font },
    {
      tone: '#669a98',
      transition: 'gentle',
      embedImage: async src => src,
      embedFont: async file => `data:font/woff2;base64,${file}`,
    },
  )

describe('presentationHtml', () => {
  it('renders every slide into one self-contained page', async () => {
    const html = await render()
    expect(html.match(/class="portable-slide"/g)).toHaveLength(presentation.slides.length)
    expect(html).toContain(slideStyles)
    expect(html).toContain('--slide-tone:#669a98')
    expect(html).toContain(`<title>${presentation.title}</title>`)
  })

  it('takes the tone, transition and screen-share safe flag from the front matter', async () => {
    const html = await presentationHtml(
      parsePresentation('---\ntone: wine\ntransition: fade\nshare-safe: true\n---\n# Hi'),
      { embedImage: async src => src, embedFont: async file => file },
    )
    expect(html).toContain('--slide-tone:#a16b7b')
    expect(html).toContain('"transition":"fade","shareSafe":true')
  })

  it('embeds images through the given function', async () => {
    const html = await render()
    expect(html).toContain('src="data:image/png;base64,')
    expect(html).not.toContain('src="/images/')
  })

  it('carries the chosen transition and screen-share safe flag into the player', async () => {
    expect(await render('slide')).toContain('"transition":"slide","shareSafe":false')
    expect(await render('none', true)).toContain('"transition":"none","shareSafe":true')
    expect(await render()).toContain('[data-transition=gentle] .kt-enter')
  })

  it('ships swipe navigation and a full-screen toggle without pagination', async () => {
    const html = await render()
    expect(html).toContain("addEventListener('touchend'")
    expect(html).toContain('aria-label="Toggle full screen"')
    expect(html).not.toContain('aria-label="Next slide"')
  })

  it('fills the space around a centered slide with the slide background', async () => {
    const html = await render()
    expect(html).toContain('<body class="slide-backdrop room-dark" style="--slide-tone:#669a98">')
    expect(html).toContain('viewport-fit=cover')
  })

  it('embeds only the chosen font', async () => {
    const html = await renderFont(presentation, 'figtree')
    expect(html).toContain(
      "@font-face{font-family:'Figtree';src:url(data:font/woff2;base64,figtree.woff2)",
    )
    expect(html).not.toContain("font-family:'Inter'")
    expect(html).not.toContain('golos-text-cyrillic.woff2')
    expect(await render()).not.toContain('@font-face')
  })

  it('embeds the Cyrillic face only when the text needs it', async () => {
    const russian = parsePresentation('# Привет, мир')
    const html = await renderFont(russian, 'figtree')
    expect(html).toContain('figtree.woff2')
    expect(html).toContain(
      "@font-face{font-family:'Golos Text';src:url(data:font/woff2;base64,golos-text-cyrillic.woff2)",
    )
    expect(html).not.toContain('golos-text.woff2')
  })
})
