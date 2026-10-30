import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parsePresentation, type Transition } from '@/lib/presentation'
import { slideStyles } from '@/lib/slide-styles'
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
      parsePresentation('---\ntone: coral\ntransition: fade\nshare-safe: true\n---\n# Hi'),
      { embedImage: async src => src, embedFont: async file => file },
    )
    expect(html).toContain('--slide-tone:#ff8577')
    expect(html).toContain('"transition":"fade","shareSafe":true')
  })

  it('prints one 16:9 page per slide with its background and no controls', async () => {
    const html = await render()
    expect(html).toContain('@page{size:16in 9in;margin:0}')
    const print = html.slice(html.indexOf('@media print'))
    expect(print).toContain('print-color-adjust:exact')
    expect(print).toContain('.portable-slide+.portable-slide{break-before:page}')
    expect(print).toContain('#full,#notice,#spoken{display:none!important}')
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
      "@font-face{font-family:'Figtree';src:url(data:font/woff2;base64,figtree-core.woff2)",
    )
    expect(html).not.toContain('figtree-extended.woff2')
    expect(html).not.toContain("font-family:'Inter'")
    expect(html).not.toContain('golos-text-cyrillic.woff2')
    expect(await render()).not.toContain('@font-face')
  })

  it('embeds the Cyrillic face only when the text needs it', async () => {
    const russian = parsePresentation('# Привет, мир')
    const html = await renderFont(russian, 'figtree')
    expect(html).toContain('figtree-core.woff2')
    expect(html).toContain(
      "@font-face{font-family:'Golos Text';src:url(data:font/woff2;base64,golos-text-cyrillic.woff2)",
    )
    expect(html).not.toContain('golos-text-core.woff2')
  })

  it('embeds the extended file instead of the core one when the text needs it', async () => {
    const html = await renderFont(parsePresentation('# Déjà vu'), 'figtree')
    expect(html).toContain(
      "@font-face{font-family:'Figtree Extended';src:url(data:font/woff2;base64,figtree-extended.woff2)",
    )
    expect(html).not.toContain('figtree-core.woff2')
    expect(html.replaceAll('&#x27;', "'")).toContain(
      "--slide-font:'Figtree Extended','Golos Text Extended',Arial",
    )
  })

  it('speaks the presentation language in the page and the player', async () => {
    const russian = parsePresentation('---\nlanguage: ru\n---\n# Привет')
    const html = await presentationHtml(russian, {
      embedImage: async src => src,
      embedFont: async file => file,
    })
    expect(html).toContain('<html lang="ru">')
    expect(html).toContain('aria-label="Слайд 1 из 1: Привет"')
    expect(html).toContain('"end":"Конец презентации"')
    expect(html).toContain('aria-label="Полный экран"')
    expect(await render()).toContain('<html lang="en">')
  })
})
