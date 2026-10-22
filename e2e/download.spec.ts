import { readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { example, expect, openSaved, test } from './fixtures'

test.beforeEach(async ({ page }) => {
  await openSaved(page, { id: 'mine', name: 'Example talk', source: example })
})

test('the web page download presents on its own, offline', async ({ page, context }) => {
  const file = await download(page, 'Web page')
  expect(file.name).toBe('example-talk.html')
  await expect(page.getByText('Downloaded · opens in any browser')).toBeVisible()

  await context.setOffline(true)
  const offline = await context.newPage()
  await offline.goto(`file://${file.path}`)
  await expect(offline.locator('.portable-slide')).toHaveCount(14)
  await expect(offline.locator('.portable-slide.active')).toHaveAccessibleName(/^Slide 1 of 14/)
  await offline.keyboard.press('ArrowRight')
  await expect(offline.locator('.portable-slide.active')).toHaveAccessibleName(/^Slide 2 of 14/)
  await expect(offline).toHaveURL(/#2$/)
  await offline.keyboard.press('End')
  await expect(offline.locator('.portable-slide.active')).toHaveAccessibleName(/^Slide 14 of 14/)
  const images = await offline
    .locator('img')
    .evaluateAll(all =>
      all.map(
        img =>
          (img as HTMLImageElement).naturalWidth > 0 &&
          img.getAttribute('src')!.startsWith('data:'),
      ),
    )
  expect(images).toEqual([true])
})

test('the PDF has one page per slide and keeps links clickable', async ({ page }) => {
  test.slow()
  const file = await download(page, 'PDF')
  expect(file.name).toBe('example-talk.pdf')
  const pdf = (await readFile(file.path)).toString('latin1')
  expect(pdf.startsWith('%PDF-')).toBe(true)
  expect(pdf.match(/\/Type\s*\/Page\b/g)).toHaveLength(14)
  expect(pdf).toContain('https://github.com/evgenius1424/kiosk-slides')
})

async function download(page: Page, format: 'Web page' | 'PDF') {
  await page.getByRole('button', { name: 'Download' }).click()
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: new RegExp(`^${format}`) }).click(),
  ])
  const path = test.info().outputPath(file.suggestedFilename())
  await file.saveAs(path)
  return { name: file.suggestedFilename(), path }
}
