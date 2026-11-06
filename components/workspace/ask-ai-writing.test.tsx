// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { KioskWorkspace } from '@/components/workspace/kiosk-workspace'
import messages from '@/messages/en.json'

const FIRST = '# One\n\n---\n\n# Two\n\n---\n\n# Three\n'
const TITLED = [
  '<!--\ntitle: Intro\n-->\n\n# One',
  '<!--\ntitle: Plan\n-->\n\n# Two',
  '<!--\ntitle: Risks\n-->\n\n# Three',
].join('\n\n---\n\n')
const EDITED = [
  '<!--\ntitle: Intro\n-->\n\n# One',
  '<!--\ntitle: Plan\n-->\n\n# Two, **shorter**',
  '<!--\ntitle: Next\n-->\n\n# Four',
].join('\n\n---\n\n')

let replies: ReturnType<typeof streamedReply>[] = []

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
})
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  history.replaceState(null, '', '/')
  replies = []
  vi.stubGlobal('fetch', async (url: string) => {
    if (url.includes('status'))
      return Response.json({ available: true, connected: true, email: 'a@b.c', planUsage: true })
    if (url.includes('models')) return Response.json({ models: [{ slug: 'm', name: 'M' }] })
    const reply = streamedReply()
    replies.push(reply)
    return new Response(reply.body)
  })
})
afterEach(cleanup)

describe('Ask AI while it writes', () => {
  it('fills the slide list one finished slide at a time', async () => {
    await askForSlides()
    await write(0, 'Here.\n<presentation>\n# One\n\n---\n\n# Tw')
    expect(listed()).toEqual(['One'])
    expect(note()).toBe('Writing slide 2…')
    await write(0, 'o\n\n---\n')
    expect(listed()).toEqual(['One', 'Two'])
    await finish(0, FIRST)
    expect(listed()).toEqual(['One', 'Two', 'Three'])
    expect(marks()).toEqual([])
  })

  it('shows which slides an edit changed, added and removed', async () => {
    await askForSlides()
    await finish(0, TITLED)
    await ask('Shorter plan, and swap the risks for next steps')
    await write(1, `Done.\n<presentation>\n${EDITED.split('# Four')[0]}`)
    expect(listed()).toEqual(['One', 'Two, shorter', 'Three'])
    expect(marks()).toEqual(['Changed', 'Not written yet'])
    await finish(1, EDITED)
    expect(listed()).toEqual(['One', 'Two, shorter', 'Four'])
    expect(marks()).toEqual(['Changed', 'New'])
    expect(screen.getByText('1 slide changed, 1 slide added, 1 slide removed')).toBeTruthy()
  })

  it('marks an untitled slide rewritten in place as changed', async () => {
    await askForSlides()
    await finish(0, FIRST)
    await ask('Shorter second slide')
    await finish(1, '# One\n\n---\n\n# Two, **shorter**\n\n---\n\n# Three\n')
    expect(marks()).toEqual(['Changed'])
    expect(screen.getByText('1 slide changed')).toBeTruthy()
  })

  it('goes back to the slides as they were when the reply fails', async () => {
    await askForSlides()
    await finish(0, FIRST)
    await ask('Rewrite it')
    await write(1, '<presentation>\n# Other\n\n---\n')
    expect(listed()).toEqual(['Other', 'Two', 'Three'])
    await act(async () => replies[1].send({ type: 'error', message: 'Too busy.' }))
    await act(async () => replies[1].close())
    await vi.waitFor(() => expect(listed()).toEqual(['One', 'Two', 'Three']))
    expect(marks()).toEqual([])
  })
})

async function askForSlides() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <KioskWorkspace
        example="# Example\n"
        prompt="GUIDE"
        slidePrompt=""
        site="https://kiosk.example"
      />
    </NextIntlClientProvider>,
  )
  fireEvent.change(screen.getByRole('textbox', { name: 'Your talk' }), {
    target: { value: 'Three things' },
  })
  fireEvent.click(await screen.findByRole('button', { name: 'Make slides' }))
  await vi.waitFor(() => expect(replies).toHaveLength(1))
}

async function ask(text: string) {
  const box = screen.getByRole('textbox', { name: 'Message ChatGPT' })
  fireEvent.change(box, { target: { value: text } })
  fireEvent.keyDown(box, { key: 'Enter' })
  await vi.waitFor(() => expect(replies).toHaveLength(2))
}

async function write(at: number, text: string) {
  await act(async () => replies[at].send({ type: 'text', text }))
}

async function finish(at: number, source: string) {
  await act(async () => {
    await replies[at].send({ type: 'text', text: `${source}</presentation>` })
    await replies[at].send({ type: 'presentation', source })
    await replies[at].send({ type: 'done', reply: 'Here.' })
    await replies[at].close()
  })
}

function listed() {
  const list = screen.getByRole('navigation', { name: 'Slides' })
  return within(list)
    .getAllByRole('button')
    .map(b => b.querySelector('.thumbnail h1, .thumbnail h2')?.textContent?.trim() ?? '')
}

function marks() {
  const list = screen.getByRole('navigation', { name: 'Slides' })
  return [...list.querySelectorAll('.slide-mark, .is-waiting .sr-only:last-child')].map(
    m => m.textContent,
  )
}

function note() {
  return document.querySelector('.chat-bubble.assistant .chat-note')?.textContent
}

function streamedReply() {
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined
  const body = new ReadableStream<Uint8Array>({ start: c => void (controller = c) })
  const encoder = new TextEncoder()
  const send = (event: { type: string; [key: string]: unknown }) => {
    controller?.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
    return new Promise(resolve => setTimeout(resolve, 0))
  }
  const close = () => {
    controller?.close()
    return new Promise(resolve => setTimeout(resolve, 0))
  }
  return { body, send, close }
}
