// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { KioskWorkspace } from '@/components/workspace/kiosk-workspace'
import { encodeShare } from '@/lib/share'
import messages from '@/messages/en.json'

const example = '---\ntitle: The example\n---\n\n# One\n\n---\n\n# Two\n\n---\n\n# Three\n'
const KEY = 'kiosk-presentations'

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
  vi.stubGlobal('fetch', async () => new Response(null, { status: 404 }))
})
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  history.replaceState(null, '', '/')
})
afterEach(cleanup)

describe('two open tabs', () => {
  it('keeps a presentation another tab saved when this tab saves next', async () => {
    store(item('mine', example))
    workspace()
    await screen.findByText('The example')
    store(...stored(), item('other', '# From the other tab\n'))
    type('# Edited here\n')
    expect(stored().map(p => p.id)).toEqual(['mine', 'other'])
    expect(stored()[0].source).toBe('# Edited here\n')
  })

  it('shows what another tab changed in the open presentation', async () => {
    store(item('mine', example))
    workspace()
    await screen.findByText('The example')
    store(item('mine', '# Changed elsewhere\n'), item('other', '# New elsewhere\n'))
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: KEY }))
    })
    expect(shownSlide()).toContain('Changed elsewhere')
    type('# Then edited here\n')
    expect(stored().map(p => p.source)).toEqual(['# Then edited here\n', '# New elsewhere\n'])
  })
})

describe('shared link', () => {
  it('leaves the shared view when a presentation is pasted', async () => {
    store(item('mine', example))
    history.replaceState(null, '', `/#s=${await encodeShare('# Shared\n')}`)
    workspace()
    await screen.findByText('Shared presentation')
    paste('# Pasted **here**\n')
    expect(screen.queryByText('Shared presentation')).toBeNull()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy()
    expect(location.hash).not.toContain('#s=')
    expect(stored().some(p => p.source === '# Pasted **here**\n')).toBe(true)
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

function item(id: string, source: string) {
  return { id, name: id === 'mine' ? 'The example' : id, source, userNamed: true, updatedAt: 1 }
}

function store(...items: ReturnType<typeof item>[]) {
  localStorage.setItem(KEY, JSON.stringify({ current: 'mine', items }))
}

function stored(): ReturnType<typeof item>[] {
  return JSON.parse(localStorage.getItem(KEY) || '{"items":[]}').items
}

function type(value: string) {
  if (!screen.queryByRole('textbox', { name: 'Slide text' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Slide text' }), { target: { value } })
}

function shownSlide() {
  return (
    document.querySelector('.canvas-slide:not(.kt-leave)')?.textContent ??
    document.querySelector('.source-slide')?.textContent ??
    ''
  )
}

function paste(text: string) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.assign(event, { clipboardData: { getData: () => text } })
  act(() => {
    document.body.dispatchEvent(event)
  })
}
