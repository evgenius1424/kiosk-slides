import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { parsePresentation } from '@/lib/presentation'
import { PLAYER_KEYS, SWIPE, swipeDelta, type PlayerAction } from '@/lib/player'
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
})

async function open() {
  const html = await presentationHtml(presentation, {
    tone: '#74747e',
    transition: 'none',
    embedImage: async src => src,
    embedFont: async file => file,
  })
  const { window } = new JSDOM(html, { runScripts: 'dangerously' })
  const { document } = window
  const slides = [...document.querySelectorAll('.portable-slide')]
  const fire = (type: string, props: object) =>
    document.dispatchEvent(Object.assign(new window.Event(type, { cancelable: true }), props))
  return {
    active: () => slides.findIndex(s => s.classList.contains('active')),
    notice: () => document.querySelector('#notice')!.textContent,
    press: (init: KeyboardEventInit) =>
      document.body.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, ...init })),
    swipe: (dx: number, dy: number) => {
      fire('touchstart', { touches: [{ clientX: 100, clientY: 100 }] })
      fire('touchend', { changedTouches: [{ clientX: 100 + dx, clientY: 100 + dy }] })
    },
    wheel: (deltaY: number, deltaMode: number) => fire('wheel', { deltaY, deltaMode }),
  }
}
