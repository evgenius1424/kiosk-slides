// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { KioskWorkspace } from '@/components/kiosk-workspace'
import { formatPresentation } from '@/lib/presentation'
import messages from '@/messages/en.json'
import { LIVE_MS } from './presentation-editor'

const example = '# One\n\n---\n\n# Two\n'

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  HTMLDialogElement.prototype.close = () => {}
})
beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('live editing', () => {
  it('updates the slides shortly after typing stops', () => {
    const textarea = openEditor()
    type(textarea, '# Uno\n\n---\n\n# Two\n')
    expect(preview()).toContain('One')
    act(() => vi.advanceTimersByTime(LIVE_MS))
    expect(preview()).toContain('Uno')
  })

  it('keeps the last good slides and points at the broken line', () => {
    const textarea = openEditor()
    type(textarea, '# One\n\n---\n\n# Two\n# Three\n')
    act(() => vi.advanceTimersByTime(LIVE_MS))
    expect(screen.getByRole('status').textContent).toContain('Line 6:')
    expect(preview()).toContain('One')
    expect(screen.getByRole('button', { name: 'Clean up' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Go to line' }))
    expect(textarea.selectionStart).toBe('# One\n\n---\n\n# Two\n'.length)
    expect(localStorage.getItem('kiosk-presentations')).toContain('# Three')
  })

  it('follows the caret into a slide and moves the caret to a picked slide', () => {
    const textarea = openEditor()
    textarea.setSelectionRange(example.length - 2, example.length - 2)
    fireEvent.select(textarea)
    expect(slideButton(2).getAttribute('aria-current')).toBe('step')
    expect(preview()).toContain('Two')
    fireEvent.click(slideButton(1))
    expect(textarea.selectionStart).toBe(0)
    expect(preview()).toContain('One')
  })

  it('tidies the text with Ctrl S', () => {
    const textarea = openEditor()
    const messy = '# One\n\n|a|b|\n|-|-|\n|1|22|\n'
    type(textarea, messy)
    act(() => vi.advanceTimersByTime(LIVE_MS))
    fireEvent.keyDown(textarea, { key: 's', ctrlKey: true })
    expect(textarea.value).toBe(formatPresentation(messy))
    expect(textarea.value).not.toBe(messy)
  })
})

describe('paste anywhere', () => {
  it('pastes a fenced presentation as a new one and undoes it', () => {
    renderWorkspace()
    paste('```markdown\n---\ntitle: Pasted plan\n---\n\n# Hello\n```')
    expect(menuName()).toBe('Pasted plan')
    expect(canvas()).toContain('Hello')
    expect(screen.getByRole('status').textContent).toContain('Pasted as “Pasted plan”')
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(menuName()).not.toBe('Pasted plan')
    expect(canvas()).toContain('One')
    expect(localStorage.getItem('kiosk-presentations')).not.toContain('Pasted plan')
  })

  it('replaces the blank starter instead of adding another', () => {
    renderWorkspace()
    fireEvent.click(document.querySelector('.presentation-selector')!)
    fireEvent.click(screen.getByRole('menuitem', { name: /New presentation/ }))
    paste('# Fresh\n')
    const saved = JSON.parse(localStorage.getItem('kiosk-presentations')!)
    expect(saved.items.map((p: { name: string }) => p.name)).toEqual(['One', 'Fresh'])
  })

  it('opens Edit with the error when the pasted presentation is broken', () => {
    renderWorkspace()
    paste('# One\n# Two\n')
    const textarea = screen.getByRole('textbox', { name: 'Slide text' }) as HTMLTextAreaElement
    expect(textarea.value).toBe('# One\n# Two\n')
    expect(
      screen
        .getAllByRole('status')
        .map(s => s.textContent)
        .join(),
    ).toContain('Line 2:')
  })

  it('ignores plain words and pastes inside the editor', () => {
    renderWorkspace()
    paste('just some words')
    expect(screen.queryByRole('status')).toBeNull()
    const textarea = openEditor()
    paste('# Elsewhere\n', textarea)
    expect(screen.queryByText(/Pasted as/)).toBeNull()
  })
})

function renderWorkspace() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <KioskWorkspace example={example} prompt="" />
    </NextIntlClientProvider>,
  )
}

function paste(text: string, target: Element = document.body) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.assign(event, { clipboardData: { getData: () => text } })
  act(() => {
    target.dispatchEvent(event)
  })
}

function canvas() {
  return document.querySelector('.canvas-slide')?.textContent ?? ''
}

function menuName() {
  return document.querySelector('.presentation-selector')?.textContent ?? ''
}

function openEditor() {
  if (!document.querySelector('.workspace')) renderWorkspace()
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
  return screen.getByRole('textbox', { name: 'Slide text' }) as HTMLTextAreaElement
}

function type(textarea: HTMLTextAreaElement, value: string) {
  fireEvent.change(textarea, { target: { value } })
}

function preview() {
  return document.querySelector('.source-slide')?.textContent ?? ''
}

function slideButton(number: number) {
  return screen.getByRole('button', { name: new RegExp(`^Slide ${number}:`) })
}
