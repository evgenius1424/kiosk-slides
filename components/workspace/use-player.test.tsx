// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { parsePresentation } from '@/lib/presentation'
import messages from '@/messages/en.json'
import { usePlayer } from './use-player'

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

function wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
