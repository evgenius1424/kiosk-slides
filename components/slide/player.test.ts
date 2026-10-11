import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { createTranslator } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import { parsePresentation } from '@/lib/presentation'
import {
  PLAYER_KEYS,
  PLAYER_WORDS,
  SWIPE,
  slideFromHash,
  slideLabel,
  swipeDelta,
  type PlayerAction,
} from '@/lib/player'
import { slideStyles } from '@/lib/slide-styles'
import messages from '@/messages/en.json'
import { presentationHtml } from './presentation-html'

const presentation = parsePresentation(readFileSync('public/example.md', 'utf8'))
const last = presentation.slides.length - 1
const moves: Partial<Record<PlayerAction, (from: number) => number>> = {
  next: from => Math.min(last, from + 1),
  previous: from => Math.max(0, from - 1),
  first: () => 0,
  last: () => last,
}

describe('exported presentation player', () => {
  it('moves between slides on every shared navigation key', async () => {
    const page = await open()
    const keys = Object.entries(PLAYER_KEYS).filter(([, action]) => moves[action])
    const landed = keys.map(([key]) => {
      page.press({ key: 'End' })
      page.press({ key: 'ArrowLeft' })
      page.press({ key })
      return [key, page.active()]
    })
    expect(landed).toEqual(keys.map(([key, action]) => [key, moves[action]!(last - 1)]))
  })

  it('toggles screen-share safe and ignores keys held with a modifier', async () => {
    const page = await open()
    page.press({ key: 's', ctrlKey: true })
    expect(page.notice()).toBe('')
    page.press({ key: 'S' })
    expect(page.notice()).toBe('Screen-share safe on')
  })

  it('reads swipes the same way as the site', async () => {
    const swipes = [
      [-80, 10],
      [80, -10],
      [10, -80],
      [-60, 55],
      [30, 20],
    ]
    const landed = await Promise.all(
      swipes.map(async ([dx, dy]) => {
        const page = await open()
        page.press({ key: 'ArrowRight' })
        page.swipe(dx, dy)
        return page.active()
      }),
    )
    expect(landed).toEqual(
      swipes.map(([dx, dy]) => {
        const delta = swipeDelta(dx, dy, true)
        return Math.abs(delta) > SWIPE.distance ? (delta < 0 ? 2 : 0) : 1
      }),
    )
  })

  it('counts wheel lines the same way as the site', async () => {
    const page = await open()
    page.wheel(5, 1)
    expect(page.active()).toBe(1)
  })

  it('starts on the slide in the address and keeps it there', async () => {
    expect((await open('#3')).active()).toBe(2)
    expect((await open('#999')).active()).toBe(last)
    expect((await open('#s=abc')).active()).toBe(0)
    const page = await open('#2')
    page.press({ key: 'ArrowRight' })
    expect(page.hash()).toBe('#3')
    expect(page.history()).toBe(1)
  })

  it('says the same words as the site', async () => {
    const page = await open()
    page.press({ key: 'p' })
    expect(page.notice()).toBe(PLAYER_WORDS.autoplay.on)
    page.press({ key: 'p' })
    expect(page.notice()).toBe(PLAYER_WORDS.autoplay.off)
    page.press({ key: 's' })
    expect(page.notice()).toBe(PLAYER_WORDS.shareSafe.on)
  })

  it('announces each slide and hides the others from screen readers', async () => {
    const page = await open()
    expect(page.spoken()).toBe('')
    page.press({ key: 'ArrowRight' })
    expect(page.spoken()).toBe(slideLabel(presentation.slides[1], 1, presentation.slides.length))
    expect(page.spoken()).toMatch(/^Slide 2 of \d+: \S/)
    expect(page.hidden()).toEqual(presentation.slides.map((_, i) => i !== 1))
  })

  it('keeps the screen awake only while autoplay runs', async () => {
    const page = await open()
    expect(page.wakeLock.request).not.toHaveBeenCalled()
    page.press({ key: 'p' })
    await vi.waitFor(() => expect(page.wakeLock.request).toHaveBeenCalledWith('screen'))
    page.press({ key: 'p' })
    await vi.waitFor(() => expect(page.wakeLock.release).toHaveBeenCalled())
  })
})

describe('player words', () => {
  it('match the site messages', () => {
    const t = createTranslator({ locale: 'en', messages, namespace: 'Workspace.toast' })
    expect({
      autoplay: { on: t('autoplay', { on: 'true' }), off: t('autoplay', { on: 'false' }) },
      shareSafe: { on: t('shareSafe', { on: 'true' }), off: t('shareSafe', { on: 'false' }) },
      end: t('end'),
      slide: createTranslator({ locale: 'en', messages, namespace: 'Workspace.canvas' })('slide', {
        number: '{number}',
        count: '{count}',
        title: '{title}',
      }),
    }).toEqual(PLAYER_WORDS)
  })
})

describe('reduced motion', () => {
  it('swaps every transition for a short fade on the site and in downloads', () => {
    const reduced = /@media\(prefers-reduced-motion:reduce\)\{(.*)\}/.exec(slideStyles)?.[1] ?? ''
    expect(reduced).toContain(
      '[data-transition] .kt-enter{animation:kt-fade-in .16s linear both!important}',
    )
    expect(reduced).toContain('[data-transition] .kt-leave{animation:none!important')
    expect(reduced).not.toMatch(/kt-(rise|sink|slide)/)
  })
})

describe('slide in the address', () => {
  it('reads bare numbers and clamps them', () => {
    expect(slideFromHash('#4', 10)).toBe(3)
    expect(slideFromHash('#0', 10)).toBe(0)
    expect(slideFromHash('#40', 10)).toBe(9)
    expect(slideFromHash('#s=4', 10)).toBeUndefined()
    expect(slideFromHash('', 10)).toBeUndefined()
  })
})

async function open(hash = '') {
  const html = await presentationHtml(presentation, {
    tone: '#74747e',
    transition: 'none',
    embedImage: async src => src,
    embedFont: async file => file,
  })
  const release = vi.fn<() => Promise<void>>(async () => {})
  const wakeLock = {
    release,
    request: vi.fn<(type: string) => Promise<object>>(async () => ({ released: false, release })),
  }
  const { window } = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: `https://example.test/presentation.html${hash}`,
    beforeParse: window => Object.defineProperty(window.navigator, 'wakeLock', { value: wakeLock }),
  })
  const { document } = window
  const slides = [...document.querySelectorAll('.portable-slide')]
  const fire = (type: string, props: object) =>
    document.dispatchEvent(Object.assign(new window.Event(type, { cancelable: true }), props))
  return {
    wakeLock,
    hash: () => window.location.hash,
    history: () => window.history.length,
    active: () => slides.findIndex(s => s.classList.contains('active')),
    notice: () => document.querySelector('#notice')!.textContent,
    spoken: () => document.querySelector('#spoken')!.textContent,
    hidden: () =>
      slides.map(s => (s as HTMLElement).inert && s.getAttribute('aria-hidden') === 'true'),
    press: (init: KeyboardEventInit) =>
      document.body.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, ...init })),
    swipe: (dx: number, dy: number) => {
      fire('touchstart', { touches: [{ clientX: 100, clientY: 100 }] })
      fire('touchend', { changedTouches: [{ clientX: 100 + dx, clientY: 100 + dy }] })
    },
    wheel: (deltaY: number, deltaMode: number) => fire('wheel', { deltaY, deltaMode }),
  }
}
