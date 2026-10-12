// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { KioskWorkspace } from '@/components/kiosk-workspace'
import { encodeShare } from '@/lib/share'
import messages from '@/messages/en.json'

const example = readFileSync('public/example.md', 'utf8')
const shared = `---\ntheme: room-light\n---\n\n# Shared **hello**\n\nFrom a friend.\n\n---\n\n# Second slide\n`

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  HTMLDialogElement.prototype.showModal = () => {}
  HTMLDialogElement.prototype.close = () => {}
})
beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('opening a shared link', () => {
  it('shows the slides read-only until Keep a copy adds them once', async () => {
    history.replaceState(null, '', `/#s=${await encodeShare(shared)}&2`)
    workspace()
    await screen.findByText('Shared presentation')
    expect(screen.getByText('Made with Kiosk Slides').getAttribute('href')).toBe('/')
    expect(screen.queryByText('Edit')).toBeNull()
    expect(screen.queryByText('Ask AI')).toBeNull()
    expect(document.querySelector('.canvas-slide:not(.kt-leave)')?.textContent).toContain(
      'Second slide',
    )
    expect(library().some(p => p.source === shared)).toBe(false)

    fireEvent.click(screen.getByText('Keep a copy'))
    await screen.findByText('Edit')
    expect(library().filter(p => p.source === shared)).toHaveLength(1)
    expect(location.hash).toBe('#2')

    cleanup()
    history.replaceState(null, '', `/#s=${await encodeShare(shared)}`)
    workspace()
    await screen.findByText('Edit')
    expect(screen.queryByText('Shared presentation')).toBeNull()
    expect(library().filter(p => p.source === shared)).toHaveLength(1)
  })

  it('drops the credit when the presentation turns it off', async () => {
    history.replaceState(null, '', `/#s=${await encodeShare(`---\ncredit: false\n---\n\n# Hi\n`)}`)
    workspace()
    await screen.findByText('Shared presentation')
    expect(screen.queryByText('Made with Kiosk Slides')).toBeNull()
  })

  it('explains a truncated link instead of crashing', async () => {
    const payload = await encodeShare(example)
    history.replaceState(null, '', `/#s=${payload.slice(0, payload.length / 2)}`)
    workspace()
    await screen.findByText('This link is incomplete. Ask for it again.')
    expect(screen.getByText('Go to my presentations').getAttribute('href')).toBe('/')
  })
})

function workspace() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <KioskWorkspace example={example} prompt="" site="https://example.com" />
    </NextIntlClientProvider>,
  )
}

function library(): { source: string }[] {
  return JSON.parse(localStorage.getItem('kiosk-presentations') || '{"items":[]}').items
}
