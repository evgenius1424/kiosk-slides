// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { KioskWorkspace } from '@/components/workspace/kiosk-workspace'
import { blankPresentation } from '@/lib/presentations'
import { encodeShare } from '@/lib/share'
import messages from '@/messages/en.json'

const example = '---\ntitle: The example\n---\n\n# One\n\n---\n\n# Two\n'
const blank = blankPresentation(
  messages.Presentations.blank.heading,
  messages.Presentations.blank.body,
)
const KEY = 'kiosk-presentations'

let fontsReady: () => void = () => {}

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
  Element.prototype.scrollIntoView = () => {}
  const slowFont = { load: () => new Promise<void>(resolve => (fontsReady = resolve)) }
  Object.defineProperty(document, 'fonts', { value: [slowFont] })
  vi.stubGlobal('fetch', async () => new Response(null, { status: 404 }))
})
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  history.replaceState(null, '', '/')
})
afterEach(cleanup)

describe('settings', () => {
  it('keeps every setting picked while the fonts are still loading', async () => {
    store(item('mine', example))
    workspace()
    await screen.findByText('The example')
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Font' }), {
      target: { value: 'figtree' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Violet tone' }))
    await act(async () => fontsReady())
    const source = stored()[0].source
    expect(source).toContain('font: figtree')
    expect(source).toContain('tone: violet')
  })

  it('never writes a font picked for one presentation into another', async () => {
    store(item('mine', example))
    workspace()
    await screen.findByText('The example')
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Font' }), {
      target: { value: 'figtree' },
    })
    paste('# Pasted\n')
    await act(async () => fontsReady())
    expect(stored().find(p => p.id === 'mine')!.source).toContain('# One')
    expect(stored().some(p => p.source.includes('# Pasted'))).toBe(true)
  })

  it('undoes one settings change at a time', async () => {
    store(item('mine', example))
    workspace()
    await screen.findByText('The example')
    type(`${example}\n---\n\n# Three\n`)
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Violet tone' }))
    fireEvent.click(screen.getByRole('button', { name: 'Coral tone' }))
    fireEvent.keyDown(document.body, { key: 'Escape' })
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true })
    expect(stored()[0].source).toContain('tone: violet')
    expect(stored()[0].source).toContain('# Three')
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true })
    expect(stored()[0].source).not.toContain('tone:')
    expect(stored()[0].source).toContain('# Three')
  })

  it('leaves the open presentation as it was when a shared link opens', async () => {
    store(item('mine', '# Mine\n'))
    history.replaceState(null, '', `/#s=${await encodeShare('# Shared\n')}`)
    workspace()
    await screen.findByRole('button', { name: 'Keep a copy' })
    expect(stored()[0].source).toBe('# Mine\n')
  })

  it('leaves the open presentation as it was when a cut-off link opens', async () => {
    store(item('mine', '# Mine\n'))
    history.replaceState(null, '', '/#s=cut')
    workspace()
    await screen.findByText('This link is incomplete. Ask for it again.')
    await act(async () => {})
    expect(stored()[0].source).toBe('# Mine\n')
  })

  it('keeps a renamed empty presentation when a shared one is kept', async () => {
    store(item('mine', blank, 'Board meeting'))
    history.replaceState(null, '', `/#s=${await encodeShare('# Shared\n')}`)
    workspace()
    fireEvent.click(await screen.findByRole('button', { name: 'Keep a copy' }))
    expect(stored().map(p => p.name)).toEqual(['Board meeting', 'Shared'])
  })
})

function workspace() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <KioskWorkspace
        example={example}
        prompt="GUIDE"
        slidePrompt="SLIDE GUIDE"
        site="https://example.com"
      />
    </NextIntlClientProvider>,
  )
}

function item(id: string, source: string, name = 'The example') {
  return { id, name, source, userNamed: true, updatedAt: 1 }
}

function store(...items: ReturnType<typeof item>[]) {
  localStorage.setItem(KEY, JSON.stringify({ current: 'mine', items }))
}

function stored(): ReturnType<typeof item>[] {
  return JSON.parse(localStorage.getItem(KEY) || '{"items":[]}').items
}

function type(value: string) {
  if (!screen.queryByRole('textbox', { name: 'Presentation source' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Presentation source' }), {
    target: { value },
  })
}

function paste(text: string) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.assign(event, { clipboardData: { getData: () => text } })
  act(() => {
    document.body.dispatchEvent(event)
  })
}
