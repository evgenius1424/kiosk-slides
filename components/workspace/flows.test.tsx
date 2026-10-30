// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { KioskWorkspace } from '@/components/workspace/kiosk-workspace'
import { STYLE_KEY } from '@/lib/last-style'
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
  Element.prototype.scrollIntoView = () => {}
  Object.defineProperty(document, 'fonts', { value: { load: async () => [] } })
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
    await screen.findByText('Share link')
    paste('# Pasted **here**\n')
    expect(screen.queryByText('Share link')).toBeNull()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy()
    expect(location.hash).not.toContain('#s=')
    expect(stored().some(p => p.source === '# Pasted **here**\n')).toBe(true)
  })
})

describe('last style', () => {
  it('starts a pasted presentation in the style chosen last', async () => {
    store(item('mine', example))
    workspace()
    await screen.findByText('The example')
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Violet tone' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Scale' }), {
      target: { value: 'hero' },
    })
    paste('---\ntheme: room-light\ntone: Coral\n---\n\n# Pasted\n')
    const pasted = stored().find(p => p.source.includes('# Pasted'))!.source
    expect(pasted).toBe('---\ntone: violet\nscale: hero\n---\n\n# Pasted\n')
  })

  it('keeps the style of a shared presentation', async () => {
    localStorage.setItem(STYLE_KEY, JSON.stringify({ tone: 'Violet' }))
    store(item('mine', example))
    const shared = '---\ntone: Coral\n---\n\n# Shared\n'
    history.replaceState(null, '', `/#s=${await encodeShare(shared)}`)
    workspace()
    fireEvent.click(await screen.findByRole('button', { name: 'Keep a copy' }))
    expect(stored().some(p => p.source === shared)).toBe(true)
    expect(JSON.parse(localStorage.getItem(STYLE_KEY)!)).toEqual({ tone: 'Violet' })
  })
})

describe('slide list', () => {
  it('moves the selected slide with the arrow keys', async () => {
    store(item('mine', example))
    workspace()
    await screen.findByText('The example')
    fireEvent.click(slideButton(1))
    fireEvent.keyDown(slideButton(1), { key: 'ArrowDown' })
    expect(shownSlide()).toContain('Two')
    expect(document.activeElement).toBe(slideButton(2))
    fireEvent.keyDown(slideButton(2), { key: 'End' })
    fireEvent.keyDown(slideButton(3), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(slideButton(3))
    fireEvent.keyDown(slideButton(3), { key: 'ArrowUp' })
    expect(shownSlide()).toContain('Two')
    expect(slideButton(2).tabIndex).toBe(0)
    expect(slideButton(3).tabIndex).toBe(-1)
  })
})

describe('undo and redo', () => {
  it('takes back a deleted slide, redoes it, and drops redo after another change', async () => {
    store(item('mine', example))
    workspace()
    await screen.findByText('The example')
    fireEvent.click(slideButton(3))
    fireEvent.keyDown(slideButton(3), { key: 'Delete' })
    expect(stored()[0].source).not.toContain('# Three')
    press('z')
    expect(stored()[0].source).toBe(example)
    press('z', true)
    expect(stored()[0].source).not.toContain('# Three')
    press('z')
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Violet tone' }))
    fireEvent.keyDown(document.body, { key: 'Escape' })
    press('z', true)
    expect(screen.getByText('Nothing to redo')).toBeTruthy()
    expect(stored()[0].source).toContain('# Three')
    expect(stored()[0].source).toContain('tone: violet')
  })

  it('takes back a clean-up without losing the text typed before it', async () => {
    store(item('mine', example))
    workspace()
    await screen.findByText('The example')
    fireEvent.click(slideButton(3))
    fireEvent.keyDown(slideButton(3), { key: 'Delete' })
    const typed = '# Table\n\n| A | Longer |\n|-|-|\n| 1 | 2 |\n\n\n'
    type(typed)
    fireEvent.click(screen.getByRole('button', { name: 'Clean up' }))
    const tidied = stored()[0].source
    expect(tidied).not.toBe(typed)
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    press('z')
    expect(stored()[0].source).toBe(typed)
    press('z', true)
    expect(stored()[0].source).toBe(tidied)
  })

  it('offers Undo on the clean-up notice while editing', async () => {
    store(item('mine', example))
    workspace()
    await screen.findByText('The example')
    const typed = '# Table\n\n| A | Longer |\n|-|-|\n| 1 | 2 |\n'
    type(typed)
    fireEvent.click(screen.getByRole('button', { name: 'Clean up' }))
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(stored()[0].source).toBe(typed)
  })

  it('leaves another presentation alone when a notice Undo is pressed after switching', async () => {
    const other = '# Four\n\n---\n\n# Five\n'
    store(item('mine', example), item('other', other))
    workspace()
    await screen.findByText('The example')
    openPresentation('other')
    fireEvent.click(slideButton(2))
    fireEvent.keyDown(slideButton(2), { key: 'Delete' })
    openPresentation('The example')
    fireEvent.click(slideButton(3))
    fireEvent.keyDown(slideButton(3), { key: 'Delete' })
    openPresentation('other')
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(stored().find(p => p.id === 'other')!.source).toBe('# Four\n')
    expect(stored().find(p => p.id === 'mine')!.source).not.toContain('# Three')
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

function slideButton(number: number) {
  return screen.getByRole('button', { name: new RegExp(`^Slide ${number}:`) })
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
  if (!screen.queryByRole('textbox', { name: 'Presentation source' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Presentation source' }), {
    target: { value },
  })
}

function openPresentation(name: string) {
  fireEvent.click(document.querySelector('.presentation-selector')!)
  fireEvent.click(screen.getByRole('button', { name }))
}

function shownSlide() {
  return (
    document.querySelector('.canvas-slide:not(.kt-leave)')?.textContent ??
    document.querySelector('.source-slide')?.textContent ??
    ''
  )
}

function press(key: string, shiftKey = false) {
  fireEvent.keyDown(document.body, { key, ctrlKey: true, shiftKey })
}

function paste(text: string) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.assign(event, { clipboardData: { getData: () => text } })
  act(() => {
    document.body.dispatchEvent(event)
  })
}
