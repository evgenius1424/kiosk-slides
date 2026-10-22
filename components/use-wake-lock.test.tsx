// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useWakeLock } from './use-wake-lock'

type Lock = { released: boolean; release: () => Promise<void> }

let visibility: DocumentVisibilityState = 'visible'
let pending: ((lock: Lock) => void)[] = []
let locks: Lock[] = []

beforeEach(() => {
  visibility = 'visible'
  pending = []
  locks = []
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request: () => new Promise<Lock>(resolve => pending.push(resolve)) },
  })
})

describe('wake lock', () => {
  it('holds no lock after presenting ends, even when the tab flickered while asking', async () => {
    const { rerender } = renderHook(({ active }) => useWakeLock(active), {
      initialProps: { active: true },
    })
    show('hidden')
    show('visible')
    expect(pending).toHaveLength(2)
    await act(async () => pending.forEach(resolve => resolve(lock())))
    expect(locks.filter(l => !l.released)).toHaveLength(1)
    rerender({ active: false })
    expect(locks.filter(l => !l.released)).toHaveLength(0)
  })
})

function show(state: DocumentVisibilityState) {
  visibility = state
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

function lock() {
  const made: Lock = {
    released: false,
    release: async () => void (made.released = true),
  }
  locks.push(made)
  return made
}
