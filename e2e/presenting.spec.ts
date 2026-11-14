import type { Page } from '@playwright/test'
import { editSource, expect, openSaved, shownSlide, test, three } from './fixtures'

test.beforeEach(async ({ page }) => {
  await openSaved(page, { id: 'mine', name: 'Three slides', source: three })
})

test('presents full screen and moves with the keys', async ({ page }) => {
  await page.keyboard.press('f')
  await expect(page.getByRole('button', { name: 'Leave presentation' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  for (const [key, number] of [
    ['ArrowRight', 2],
    [' ', 3],
    ['ArrowLeft', 2],
    ['Home', 1],
    ['End', 3],
  ] as const) {
    await page.keyboard.press(key)
    await expect(shownSlide(page)).toHaveAccessibleName(new RegExp(`^Slide ${number} of 3`))
    await expect(page).toHaveURL(new RegExp(`#${number}$`))
  }
  await page.keyboard.press('ArrowRight')
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 3 of 3/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Leave presentation' })).toBeHidden()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false)
})

test('opens at the slide named in the address', async ({ page }) => {
  await page.goto('/#3')
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 3 of 3/)
  await page.goto('/#2')
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 2 of 3/)
})

test('autoplays and stops when P is pressed again', async ({ page }) => {
  await page.clock.install()
  await page.reload()
  await startAutoplay(page)
  await page.clock.runFor(13_000)
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 2 of 3/)
  await page.keyboard.press('p')
  await expect(page.getByText('Autoplay off')).toBeVisible()
  await page.clock.runFor(30_000)
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 2 of 3/)
})

test('autoplay without a loop stops at the end', async ({ page }) => {
  await editSource(page, '---\nduration: 5s\nloop: false\n---\n\n# One\n\n---\n\n# Two\n')
  await page.clock.install()
  await page.reload()
  await startAutoplay(page)
  await page.clock.runFor(5_500)
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 2 of 2/)
  await page.clock.runFor(5_000)
  await expect(page.getByText('End of presentation')).toBeVisible()
  await page.clock.runFor(30_000)
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 2 of 2/)
})

test('turns screen-share safe on with S', async ({ page }) => {
  await page.keyboard.press('s')
  await expect(page.getByText('Screen-share safe on')).toBeVisible()
  await page.keyboard.press('s')
  await expect(page.getByText('Screen-share safe off')).toBeVisible()
})

test('moves with the on-screen buttons', async ({ page }) => {
  await page.getByRole('button', { name: 'Next slide' }).click()
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 2 of 3/)
  await page.getByRole('button', { name: 'Previous slide' }).click()
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 1 of 3/)
  await expect(page.getByRole('button', { name: 'Previous slide' })).toBeDisabled()
})

test('draws with the laser pointer and lets the ink fade', async ({ page }) => {
  await page.keyboard.press('f')
  await page.keyboard.press('l')
  await expect(page.getByText('Laser pointer on')).toBeVisible()
  await page.mouse.move(300, 300)
  await page.mouse.down()
  await page.mouse.move(500, 360, { steps: 12 })
  await page.mouse.up()
  expect(await page.evaluate(() => getSelection()?.toString())).toBe('')
  await page.keyboard.press('ArrowRight')
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 2 of 3/)
  await expect.poll(() => inked(page)).toBe(true)
  await page.keyboard.press('l')
  await expect(page.getByText('Laser pointer off')).toBeVisible()
  await expect.poll(() => inked(page), { timeout: 5000 }).toBe(false)
})

async function startAutoplay(page: Page) {
  await expect(page.locator('main.workspace')).not.toHaveClass(/is-loading/)
  await page.keyboard.press('p')
  await expect(page.getByText('Autoplay on')).toBeVisible()
}

function inked(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.laser-layer')!
    const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
    return data.some((value, i) => i % 4 === 3 && value > 0)
  })
}
