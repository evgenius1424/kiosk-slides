// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { SkillPanel } from '@/components/skill-panel'
import messages from '@/messages/en.json'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
})
afterEach(cleanup)

describe('adding the skill to an AI', () => {
  it('starts with Claude Code and shows its named command', () => {
    panel()
    expect(screen.getByRole('tab', { name: 'Claude Code' }).getAttribute('aria-selected')).toBe(
      'true',
    )
    expect(screen.queryByRole('tab', { name: 'Claude' })).toBeNull()
    expect(screen.getByText(/^\/kiosk-slides Make/)).toBeTruthy()
  })

  it('names the skill in the example ask for every app', () => {
    panel()
    for (const tab of screen.getAllByRole('tab')) {
      fireEvent.click(tab)
      expect(document.querySelector('.skill-try .copy-line')?.textContent).toContain('kiosk-slides')
    }
  })

  it('copies each install line for the chosen app', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    panel()
    fireEvent.click(screen.getByRole('tab', { name: 'Claude Code' }))
    const line = screen.getByText('/plugin install kiosk-slides@kiosk-slides')
    fireEvent.click(line.parentElement!.querySelector('button')!)
    expect(writeText).toHaveBeenCalledWith('/plugin install kiosk-slides@kiosk-slides')
    expect(await screen.findByText('Copied')).toBeTruthy()
    vi.unstubAllGlobals()
  })

  it('shows a command for every app', () => {
    panel()
    for (const tab of screen.getAllByRole('tab')) {
      fireEvent.click(tab)
      expect(document.querySelectorAll('.skill-commands code').length).toBeGreaterThan(0)
    }
  })
})

function panel() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SkillPanel open onClose={() => {}} />
    </NextIntlClientProvider>,
  )
}
