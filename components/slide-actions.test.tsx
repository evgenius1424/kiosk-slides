// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { KioskWorkspace } from '@/components/kiosk-workspace'
import { slideSource } from '@/lib/presentation'
import messages from '@/messages/en.json'

const SIGNED_IN = { available: true, connected: true, email: 'a@b.c', planUsage: true }
const source =
  '---\ntitle: Plan\n---\n\n# One\n\nA very long and wordy sentence about the first idea.\n\n---\n\n# Two\n\nSecond.\n\n---\n\n# Three\n'

let clipboard = ''
let requests: Record<string, unknown>[] = []

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
  Element.prototype.scrollTo = () => {}
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async (text: string) => void (clipboard = text) },
  })
})
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  history.replaceState(null, '', '/')
  localStorage.setItem(
    'kiosk-presentations',
    JSON.stringify({
      current: 'p',
      items: [{ id: 'p', name: 'Plan', source, userNamed: true, updatedAt: 1 }],
    }),
  )
  clipboard = ''
  requests = []
})
afterEach(cleanup)

describe('AI actions on a slide', () => {
  it('replaces only the current slide when signed in, and undo brings it back', async () => {
    signedIn('<slides>\n# One\n\nShort.\n</slides>')
    workspace()
    await act(async () => fireEvent.click(action('Shorter')))
    await vi.waitFor(() => expect(text()).not.toBe(source))
    expect(requests[0]).toMatchObject({ mode: 'slide', action: 'shorter', index: 0, model: 'm' })
    expect(slideSource(text(), 0)).toBe('# One\n\nShort.')
    expect(text().slice(text().indexOf('---\n\n# Two'))).toBe(
      source.slice(source.indexOf('---\n\n# Two')),
    )
    expect(screen.getByRole('status', { name: '' }).textContent).toContain('Slide 1 changed')

    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true })
    expect(text()).toBe(source)
  })

  it('turns one slide into two with Split in two', async () => {
    signedIn('<slides>\n# Two A\n\n---\n\n# Two B\n</slides>')
    workspace()
    fireEvent.click(slideButton(2))
    await act(async () => fireEvent.click(action('Split in two')))
    await vi.waitFor(() => expect(slideCount()).toBe(4))
    expect(slideSource(text(), 1)).toBe('# Two A')
    expect(slideSource(text(), 2)).toBe('# Two B')
    expect(slideSource(text(), 3)).toBe('# Three')
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(text()).toBe(source)
  })

  it('offers the actions in the slide list menu', async () => {
    signedIn('<slides>\n# **Three** wins\n</slides>')
    workspace()
    fireEvent.contextMenu(slideButton(3))
    const menu = screen.getByRole('menu', { name: 'Slide 3 actions' })
    await act(async () =>
      fireEvent.click(within(menu).getByRole('menuitem', { name: 'Stronger headline' })),
    )
    await vi.waitFor(() => expect(slideSource(text(), 2)).toBe('# **Three** wins'))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('copies a slide prompt on the hosted site and takes the pasted slide in a dialog', async () => {
    hosted()
    workspace()
    await act(async () => fireEvent.click(action('Make it visual')))
    expect(clipboard).toMatch(/^SLIDE GUIDE\n\nThe whole presentation, for context:/)
    expect(clipboard).toContain('<slide>\n# One\n\nA very long')
    const dialog = screen.getByRole('dialog', { name: 'Paste the new slide here' })
    const field = within(dialog).getByRole('textbox', { name: 'New slide' })
    paste(field, '# Ignored by paste anywhere\n')
    expect(text()).toBe(source)

    fireEvent.change(field, { target: { value: '# One\n# Two headings' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Replace slide' }))
    expect(within(dialog).getByRole('alert').textContent).toMatch(/^Line \d+:/)

    fireEvent.change(field, {
      target: {
        value: 'Here it is:\n```markdown\n# One\n\n1. First\n2. Second\n```',
      },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Replace slide' }))
    expect(slideSource(text(), 0)).toBe('# One\n\n1. First\n2. Second')
    expect((dialog as HTMLDialogElement).open).toBe(false)
    expect(slideCount()).toBe(3)
  })

  it('hides the actions unless the flag is on', () => {
    signedIn('<slides>\n# One\n</slides>')
    workspace(false)
    expect(screen.queryByRole('toolbar', { name: 'Change this slide with AI' })).toBeNull()
    fireEvent.contextMenu(slideButton(3))
    const menu = screen.getByRole('menu', { name: 'Slide 3 actions' })
    expect(within(menu).queryByRole('menuitem', { name: 'Stronger headline' })).toBeNull()
    expect(within(menu).getByRole('menuitem', { name: 'Add a slide after' })).toBeTruthy()
  })

  it('says so when there is nothing to undo', () => {
    hosted()
    workspace()
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true })
    expect(document.querySelector('.toast')?.textContent).toContain('Nothing to undo')
  })
})

function signedIn(reply: string) {
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (url.includes('status')) return Response.json(SIGNED_IN)
    if (url.includes('models')) return Response.json({ models: [{ slug: 'm', name: 'M' }] })
    const body = JSON.parse(String(init?.body))
    requests.push(body)
    if (body.mode !== 'slide') return new Response(null, { status: 500 })
    const events = [
      { type: 'slides', markdown: reply.replace(/<\/?slides>/g, '').trim() },
      { type: 'done', reply },
    ]
    return new Response(events.map(e => JSON.stringify(e)).join('\n') + '\n')
  })
}

function hosted() {
  vi.stubGlobal('fetch', async (url: string) =>
    url.includes('status')
      ? Response.json({ available: false, reason: 'Runs on your computer.' })
      : new Response(null, { status: 404 }),
  )
}

function workspace(slideAi = true) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <KioskWorkspace
        example={source}
        prompt="GUIDE"
        slidePrompt="SLIDE GUIDE"
        site="https://example.com"
        slideAi={slideAi}
      />
    </NextIntlClientProvider>,
  )
}

function action(name: string) {
  return within(screen.getByRole('toolbar', { name: 'Change this slide with AI' })).getByRole(
    'button',
    { name },
  )
}

function slideButton(number: number) {
  return screen.getByRole('button', { name: new RegExp(`^Slide ${number}:`) })
}

function slideCount() {
  return document.querySelectorAll('.slide-nav').length
}

function text() {
  const stored = JSON.parse(localStorage.getItem('kiosk-presentations') || '{}')
  return stored.items[0].source as string
}

function paste(target: HTMLElement, value: string) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.assign(event, { clipboardData: { getData: () => value } })
  act(() => {
    target.dispatchEvent(event)
  })
}
