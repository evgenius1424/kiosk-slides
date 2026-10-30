import type { Page } from '@playwright/test'
import { example, expect, openSaved, test } from './fixtures'

test.beforeEach(async ({ page }) => {
  await openSaved(page, { id: 'mine', name: 'Example', source: example })
})

test('hides the slide at every size it passes while the window resizes', async ({ page }) => {
  await settled(page)
  await record(page)
  for (let step = 1; step <= 12; step++) {
    await page.setViewportSize({ width: 1440 + step * 10, height: 900 + step * 12 })
    await page.waitForTimeout(16)
  }
  await expectHiddenWhileResizing(page)
})

test('hides the slide while presenting takes over the screen', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 760 })
  await settled(page)
  await record(page)
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = () => Promise.resolve()
  })
  await page.keyboard.press('f')
  for (let step = 1; step <= 8; step++) {
    await page.setViewportSize({ width: 1300 + step * 18, height: 760 + step * 17 })
    await page.waitForTimeout(16)
  }
  await expectHiddenWhileResizing(page)
})

test('does not hide the slide while the page loads', async ({ page }) => {
  await page.addInitScript(() => {
    const seen: string[] = []
    Object.assign(window, { settlingSeen: seen })
    new MutationObserver(records => {
      for (const { target } of records)
        if ((target as HTMLElement).dataset.settling !== undefined) seen.push('settling')
    }).observe(document, { attributes: true, attributeFilter: ['data-settling'], subtree: true })
  })
  await page.reload()
  await expect(page.getByRole('region', { name: /^Slide 1 of/ })).toBeVisible()
  await page.waitForTimeout(800)
  expect(
    await page.evaluate(() => (window as unknown as { settlingSeen: string[] }).settlingSeen),
  ).toEqual([])
})

type Frame = { size: string; opacity: number }

async function settled(page: Page) {
  await expect(page.locator('.canvas-shell[data-settling]')).toHaveCount(0)
  await expect.poll(() => slideOpacity(page)).toBe('1')
}

function slideOpacity(page: Page) {
  return page.evaluate(() => getComputedStyle(document.querySelector('.canvas-slide > *')!).opacity)
}

async function record(page: Page) {
  await page.evaluate(() => {
    const frames: Frame[] = []
    Object.assign(window, { slideFrames: frames })
    const shell = document.querySelector('.canvas-shell')!
    let measured = false
    new ResizeObserver(([entry]) => {
      if (!measured) return void (measured = true)
      const box = entry.contentRect
      frames.push({
        size: `${Math.round(box.width)}x${Math.round(box.height)}`,
        opacity: Number(getComputedStyle(shell.querySelector('.canvas-slide > *')!).opacity),
      })
    }).observe(shell)
  })
}

async function expectHiddenWhileResizing(page: Page) {
  const frames = await page.evaluate(
    () => (window as unknown as { slideFrames: Frame[] }).slideFrames,
  )
  expect(new Set(frames.map(frame => frame.size)).size).toBeGreaterThanOrEqual(3)
  expect(frames.filter(frame => frame.opacity > 0)).toEqual([])
  await settled(page)
}
