// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { KioskWorkspace } from '@/components/kiosk-workspace'
import messages from '@/messages/en.json'

const example = '---\ntitle: The example\n---\n\n# One\n\n---\n\n# Two\n'
const SIGNED_IN = { available: true, connected: true, email: 'a@b.c', planUsage: true }

let clipboard = ''
let chats: { messages: { content: string }[] }[] = []

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
  Element.prototype.scrollTo = () => {}
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async (text: string) => void (clipboard = text) },
  })
})
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  history.replaceState(null, '', '/')
  clipboard = ''
  chats = []
  hosted()
})
afterEach(cleanup)

describe('start screen', () => {
  it('opens a fresh browser on the question, not the example', () => {
    workspace()
    expect(screen.getByRole('heading', { name: 'What’s your talk about?' })).toBeTruthy()
    expect(document.querySelector('main')?.hasAttribute('inert')).toBe(true)
  })

  it('copies a prompt ending in the topic on the hosted site, then takes the pasted answer', async () => {
    workspace()
    fireEvent.click(screen.getByRole('button', { name: 'Leadership' }))
    fireEvent.click(screen.getByRole('button', { name: 'Short (5)' }))
    fireEvent.change(topic(), { target: { value: 'Moving to a four-day week' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' })))
    expect(clipboard).toMatch(/^GUIDE\n\nHere is my request:\n/)
    expect(clipboard).toMatch(
      /My talk: Moving to a four-day week\nAudience: leadership\.\nLength: about 5 slides\.\n.*$/,
    )
    expect(screen.getByRole('heading', { name: 'Now paste the answer here' })).toBeTruthy()

    paste('```markdown\n---\ntitle: Four days\n---\n\n# Less is **more**\n```')
    expect(screen.queryByRole('heading', { name: 'Now paste the answer here' })).toBeNull()
    expect(menuName()).toBe('Four days')
    expect(library().map(p => p.name)).toEqual(['Four days'])
  })

  it('fills the box from a starter and selects the first gap', async () => {
    workspace()
    fireEvent.click(screen.getByRole('button', { name: 'Pitch' }))
    await act(() => new Promise(requestAnimationFrame))
    const box = topic()
    expect(box.value).toBe(messages.Start.starters.pitch.text)
    expect(box.value.slice(box.selectionStart, box.selectionEnd)).toBe('…')
  })

  it('opens the example or a blank presentation, and New presentation comes back here', () => {
    workspace()
    fireEvent.click(screen.getByRole('button', { name: /See an example/ }))
    expect(menuName()).toBe('The example')
    expect(library()).toHaveLength(1)

    fireEvent.click(document.querySelector('.presentation-selector')!)
    fireEvent.click(screen.getByRole('button', { name: /New presentation/ }))
    expect(screen.getByRole('heading', { name: 'What’s your talk about?' })).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(menuName()).toBe('The example')

    fireEvent.click(document.querySelector('.presentation-selector')!)
    fireEvent.click(screen.getByRole('button', { name: /New presentation/ }))
    fireEvent.click(screen.getByRole('button', { name: /Start blank/ }))
    expect(screen.getByRole('textbox', { name: 'Slide text' })).toBeTruthy()
    expect(library()).toHaveLength(2)
  })

  it('lands returning visitors on their last presentation', () => {
    workspace()
    fireEvent.click(screen.getByRole('button', { name: /See an example/ }))
    cleanup()
    workspace()
    expect(screen.queryByRole('heading', { name: 'What’s your talk about?' })).toBeNull()
  })

  it('sends the request to Ask AI when signed in locally', async () => {
    signedIn()
    workspace()
    fireEvent.change(topic(), { target: { value: 'Our onboarding' } })
    fireEvent.click(screen.getByRole('button', { name: 'A class' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Make slides' }))
    await vi.waitFor(() => expect(chats).toHaveLength(1))
    expect(chats[0].messages[0].content).toMatch(/^My talk: Our onboarding\nAudience: a class/)
    expect(screen.getByRole('button', { name: 'Ask AI' }).className).toBe('active')
  })
})

function hosted() {
  vi.stubGlobal('fetch', async (url: string) =>
    url.includes('status')
      ? Response.json({ available: false, reason: 'Runs on your computer.' })
      : new Response(null, { status: 404 }),
  )
}

function signedIn() {
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (url.includes('status')) return Response.json(SIGNED_IN)
    if (url.includes('models')) return Response.json({ models: [{ slug: 'm', name: 'M' }] })
    chats.push(JSON.parse(String(init?.body)))
    return new Response(null, { status: 500 })
  })
}

function workspace() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <KioskWorkspace example={example} prompt="GUIDE" site="https://example.com" />
    </NextIntlClientProvider>,
  )
}

function topic() {
  return screen.getByRole('textbox', { name: 'Your talk' }) as HTMLTextAreaElement
}

function paste(text: string) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.assign(event, { clipboardData: { getData: () => text } })
  act(() => {
    document.body.dispatchEvent(event)
  })
}

function menuName() {
  return document.querySelector('.presentation-selector')?.textContent ?? ''
}

function library(): { name: string; source: string }[] {
  return JSON.parse(localStorage.getItem('kiosk-presentations') || '{"items":[]}').items
}
