// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, expect, it, vi } from 'vitest'
import { PresentationChat } from '@/components/presentation-chat'
import messages from '@/messages/en.json'

const TITLE = 'Use any AI chat to write your slides.'

afterEach(cleanup)

it('keeps the last answer on screen while the next check runs', async () => {
  vi.stubGlobal('fetch', async () => Response.json({ available: false, reason: 'Hosted.' }))
  const first = chat()
  expect(await screen.findByRole('heading', { name: TITLE })).toBeTruthy()
  first.unmount()

  vi.stubGlobal('fetch', () => new Promise(() => {}))
  chat()
  expect(screen.getByRole('heading', { name: TITLE })).toBeTruthy()
})

function chat() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PresentationChat
        source=""
        onPresentation={() => ''}
        onOpen={() => {}}
        onCopyPrompt={() => {}}
        onRequestTaken={() => {}}
      />
    </NextIntlClientProvider>,
  )
}
