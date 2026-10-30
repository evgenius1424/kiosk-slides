// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { parsePresentation } from '@/lib/presentation'
import messages from '@/messages/en.json'
import { INITIAL_PLAYER, playerReducer, usePlayer, type PlayerState } from './use-player'

const three = parsePresentation('# One\n\n---\n\n# Two\n\n---\n\n# Three\n')
const two = parsePresentation('# One\n\n---\n\n# Two\n')

describe('player', () => {
  it('follows the slides when the last ones disappear', () => {
    const { result, rerender } = renderHook(
      ({ presentation }) => usePlayer(presentation, () => {}),
      { initialProps: { presentation: three }, wrapper },
    )
    act(() => result.current.go(2))
    rerender({ presentation: two })
    expect(result.current.index).toBe(1)
    act(() => result.current.move(-1))
    expect(result.current.at).toBe(0)
  })
})

describe('player reducer', () => {
  const on = (state: Partial<PlayerState>) => ({ ...INITIAL_PLAYER, ...state })

  it('stops autoplay on the last slide unless it loops', () => {
    expect(
      playerReducer(on({ index: 2, playing: true }), { type: 'tick', count: 3, loop: false }),
    ).toEqual(on({ index: 2, playing: false }))
    expect(
      playerReducer(on({ index: 2, playing: true }), { type: 'tick', count: 3, loop: true }),
    ).toEqual(on({ index: 0, playing: true }))
  })

  it('stops autoplay when you step or pick a slide, but not when Edit follows the cursor', () => {
    const playing = on({ index: 1, playing: true })
    expect(playerReducer(playing, { type: 'move', delta: 1, count: 3 })).toEqual(on({ index: 2 }))
    expect(playerReducer(playing, { type: 'go', index: 0 })).toEqual(on({ index: 0 }))
    expect(playerReducer(playing, { type: 'show', index: 0 }).playing).toBe(true)
  })

  it('remembers a jump only until the slide changes again', () => {
    const jumped = playerReducer(INITIAL_PLAYER, { type: 'jump', index: 2 })
    expect(jumped.jumped).toBe(2)
    expect(playerReducer(jumped, { type: 'show', index: 2 }).jumped).toBe(2)
    expect(playerReducer(jumped, { type: 'move', delta: -1, count: 3 }).jumped).toBeNull()
  })

  it('wakes and stops when presenting ends', () => {
    const presenting = on({ presenting: true, playing: true, idle: true })
    expect(playerReducer(presenting, { type: 'leave' })).toEqual(INITIAL_PLAYER)
  })
})

function wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
