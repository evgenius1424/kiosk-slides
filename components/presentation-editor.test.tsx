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

function openEditor() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <KioskWorkspace example={example} prompt="" site="https://example.com" />
    </NextIntlClientProvider>,
  )
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
