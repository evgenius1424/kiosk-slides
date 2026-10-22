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
  await page.keyboard.press('p')
  await expect(page.getByText('Autoplay on')).toBeVisible()
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
  await page.keyboard.press('p')
  await page.clock.runFor(12_000)
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 2 of 2/)
  await expect(page.getByText('End of presentation')).toBeVisible()
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
