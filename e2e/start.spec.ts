import { expect, openSaved, paste, slideList, stored, test, three } from './fixtures'

test.describe('start screen', () => {
  test('greets a first visit and opens the example', async ({ page }) => {
    await page.goto('/')
    const start = page.getByRole('dialog', { name: 'What’s your talk about?' })
    await expect(start).toBeVisible()
    await start.getByRole('button', { name: 'Open this example' }).click()
    await expect(start).toBeHidden()
    await expect(slideList(page)).toHaveCount(14)
    expect((await stored(page)).map(p => p.name)).toEqual(['Kiosk Slides — example presentation'])
  })

  test('starts blank in the editor', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Start blank' }).click()
    await expect(page.getByRole('textbox', { name: 'Presentation source' })).toBeVisible()
    await expect(slideList(page)).toHaveCount(1)
    await expect(page.getByRole('status').filter({ hasText: 'created' })).toBeVisible()
  })

  test('copies a prompt with the topic and takes the pasted answer', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('textbox', { name: 'Your talk' }).fill('Moving to a four-day week')
    await page.getByRole('button', { name: 'Copy prompt' }).click()
    const prompt = await page.evaluate(() => navigator.clipboard.readText())
    expect(prompt).toContain('Moving to a four-day week')
    await paste(page, three)
    await expect(page.getByRole('dialog', { name: 'What’s your talk about?' })).toBeHidden()
    await expect(slideList(page)).toHaveCount(3)
    expect((await stored(page)).map(p => p.source)).toContain(three)
  })

  test('remembers the talk while it is being written', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('textbox', { name: 'Your talk' }).fill('Quarterly results')
    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Your talk' })).toHaveValue('Quarterly results')
  })

  test('stays away for a returning visitor and opens again for a new presentation', async ({
    page,
  }) => {
    await openSaved(page, { id: 'mine', name: 'Three slides', source: three })
    const start = page.getByRole('dialog', { name: 'What’s your talk about?' })
    await expect(start).toBeHidden()
    await page.getByRole('button', { name: 'Three slides', exact: true }).click()
    await page.getByRole('button', { name: 'New presentation' }).click()
    await expect(start).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(start).toBeHidden()
    await expect(slideList(page)).toHaveCount(3)
  })
})
