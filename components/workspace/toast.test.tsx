// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from './toast'

const undo = { label: 'Undo', run: () => {} }

describe('notice', () => {
  let state: DocumentVisibilityState = 'visible'
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => state)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    state = 'visible'
  })

  it('waits while the page is hidden', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.notice('Slide deleted', undo))
    act(() => vi.advanceTimersByTime(5000))
    act(() => setVisibility('hidden'))
    act(() => vi.advanceTimersByTime(60_000))
    expect(result.current.toast?.message).toBe('Slide deleted')
    act(() => setVisibility('visible'))
    act(() => vi.advanceTimersByTime(2900))
    expect(result.current.toast).not.toBeNull()
    act(() => vi.advanceTimersByTime(200))
    expect(result.current.toast).toBeNull()
  })

  it('waits while the pointer is on it', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.notice('Copied'))
    act(() => result.current.hold(true))
    act(() => vi.advanceTimersByTime(10_000))
    expect(result.current.toast?.message).toBe('Copied')
    act(() => result.current.hold(false))
    act(() => vi.advanceTimersByTime(2600))
    expect(result.current.toast).toBeNull()
  })

  it('starts a new notice with its full time even if the last one was held', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.notice('Copied'))
    act(() => result.current.hold(true))
    act(() => result.current.notice('Saved'))
    act(() => vi.advanceTimersByTime(2600))
    expect(result.current.toast).toBeNull()
  })

  function setVisibility(next: DocumentVisibilityState) {
    state = next
    document.dispatchEvent(new Event('visibilitychange'))
  }
})
