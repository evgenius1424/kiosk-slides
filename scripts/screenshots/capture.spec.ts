import { expect, test } from '../../e2e/fixtures'

const output = 'screenshots/generated'

test('capture the workspace', async ({ page }) => {
  await page.goto('/')
  const start = page.getByRole('dialog', { name: 'What’s your talk about?' })
  await expect(start).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${output}/1-kiosk-slides-homepage.png`, animations: 'disabled' })

  await start.getByRole('button', { name: 'Open this example' }).click()
  await expect(start).toBeHidden()
  await expect(page.getByRole('region', { name: /^Slide 1 of/ })).toBeVisible()
  await page.screenshot({
    path: `${output}/2-kiosk-slides-presentation-preview.png`,
    animations: 'disabled',
  })

  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('complementary', { name: 'Presentation settings' })).toBeVisible()
  await page.screenshot({
    path: `${output}/3-kiosk-slides-presentation-settings.png`,
    animations: 'disabled',
  })

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Presentation source' })).toBeVisible()
  await page.screenshot({
    path: `${output}/4-kiosk-slides-presentation-editor.png`,
    animations: 'disabled',
  })
})
