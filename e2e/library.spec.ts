import type { Page } from '@playwright/test'
import { editSource, expect, openSaved, slideList, stored, test, three } from './fixtures'

const other = { id: 'other', name: 'Other talk', source: '# Other\n' }

test.beforeEach(async ({ page }) => {
  await openSaved(page, { id: 'mine', name: 'Three slides', source: three }, other)
})

test('switches between saved presentations', async ({ page }) => {
  await (
    await menu(page, 'Three slides')
  )
    .getByRole('button', { name: 'Other talk', exact: true })
    .click()
  await expect(slideList(page)).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Other talk', exact: true })).toBeVisible()
})

test('renames a presentation', async ({ page }) => {
  await (
    await menu(page, 'Three slides')
  )
    .getByRole('button', { name: 'Rename Three slides' })
    .click()
  const field = page.getByRole('textbox', { name: 'Presentation name' })
  await field.fill('Quarterly review')
  await field.press('Enter')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Quarterly review', exact: true })).toBeVisible()
  expect((await stored(page)).map(p => p.name)).toContain('Quarterly review')
})

test('deletes a presentation after confirming', async ({ page }) => {
  page.once('dialog', dialog => dialog.accept())
  await (
    await menu(page, 'Three slides')
  )
    .getByRole('button', { name: 'Delete Three slides' })
    .click()
  await expect(slideList(page)).toHaveCount(1)
  expect((await stored(page)).map(p => p.id)).toEqual(['other'])
})

test('keeps a presentation when the delete is cancelled', async ({ page }) => {
  page.once('dialog', dialog => dialog.dismiss())
  await (
    await menu(page, 'Three slides')
  )
    .getByRole('button', { name: 'Delete Three slides' })
    .click()
  expect(await stored(page)).toHaveLength(2)
})

test('two open tabs keep each other’s changes', async ({ page, context }) => {
  const second = await context.newPage()
  await second.goto('/')
  await expect(slideList(second)).toHaveCount(3)
  await (
    await menu(second, 'Three slides')
  )
    .getByRole('button', { name: 'Other talk', exact: true })
    .click()
  await editSource(second, '# Other, edited in tab two\n')
  await editSource(page, '# Three, edited in tab one\n')
  await expect
    .poll(async () => (await stored(page)).map(p => p.source).sort())
    .toEqual(['# Other, edited in tab two\n', '# Three, edited in tab one\n'])
})

async function menu(page: Page, current: string) {
  await page.getByRole('button', { name: current, exact: true }).click()
  return page.getByRole('dialog', { name: 'Presentations' })
}
