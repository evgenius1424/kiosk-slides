import type { Page } from '@playwright/test'
import {
  editSource,
  expect,
  openSaved,
  shownSlide,
  slideList,
  stored,
  test,
  three,
} from './fixtures'

test.beforeEach(async ({ page }) => {
  await openSaved(page, { id: 'mine', name: 'Three slides', source: three })
})

test('slides follow the text as it is typed and are saved', async ({ page }) => {
  await editSource(page, '# First\n\n---\n\n# Second **idea**\n')
  await expect(slideList(page)).toHaveCount(2)
  await page.getByRole('button', { name: 'Preview' }).click()
  await slideList(page).nth(1).click()
  await expect(shownSlide(page).getByRole('heading')).toHaveText('Second idea')
  await page.reload()
  await expect(slideList(page)).toHaveCount(2)
  expect((await stored(page))[0].source).toBe('# First\n\n---\n\n# Second **idea**\n')
})

test('shows a fix-it message for broken text and recovers', async ({ page }) => {
  await editSource(page, '# One\n\n<!-- metric -->\nno bold value\n')
  const editor = page.getByRole('textbox', { name: 'Presentation source' })
  await expect(editor).toHaveAttribute('aria-invalid', 'true')
  await editor.fill('# Fixed\n')
  await expect(editor).toHaveAttribute('aria-invalid', 'false')
  await expect(slideList(page)).toHaveCount(1)
})

test('adds a slide, deletes one and undoes the delete', async ({ page }) => {
  await page.getByRole('button', { name: 'Add a slide' }).click()
  await expect(slideList(page)).toHaveCount(4)
  await expect(page.getByRole('textbox', { name: 'Presentation source' })).toContainText(
    'New slide',
  )
  await page.getByRole('button', { name: 'Preview' }).click()
  await slideList(page).first().click()
  await page.keyboard.press('Delete')
  await expect(slideList(page)).toHaveCount(3)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(slideList(page)).toHaveCount(4)
  await expect(slideList(page).first()).toContainText('One')
})

test('cleans up tables and spacing', async ({ page }) => {
  await editSource(page, '# Table\n\n| A | Longer |\n|-|-|\n| 1 | 2 |\n\n\n\n')
  await page.getByRole('button', { name: 'Clean up' }).click()
  await expect(page.getByRole('textbox', { name: 'Presentation source' })).toHaveValue(
    '# Table\n\n| A   | Longer |\n| --- | ------ |\n| 1   | 2      |\n',
  )
})

test('moves through slides with the slide list keys', async ({ page }) => {
  await slideList(page).first().click()
  await page.keyboard.press('ArrowDown')
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 2 of 3/)
  await expect(slideList(page).nth(1)).toBeFocused()
  await page.keyboard.press('End')
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 3 of 3/)
})

test('keeps the selected slide outline inside the slide list', async ({ page }) => {
  const many = Array.from({ length: 12 }, (_, i) => `# Slide ${i + 1}`).join('\n\n---\n\n')
  await page.setViewportSize({ width: 1280, height: 600 })
  await editSource(page, `${many}\n`)
  await expect(slideList(page)).toHaveCount(12)
  await slideList(page).first().focus()
  for (const key of ['Home', 'ArrowDown', 'End', 'ArrowUp']) {
    await page.keyboard.press(key)
    expect(await outlineOverflow(page)).toBe(0)
  }
})

async function outlineOverflow(page: Page) {
  return page.locator('.slide-nav:focus-visible').evaluate(item => {
    const style = getComputedStyle(item)
    const ring = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset)
    const box = item.getBoundingClientRect()
    const list = item.parentElement!.getBoundingClientRect()
    return Math.max(
      0,
      list.top - (box.top - ring),
      box.bottom + ring - list.bottom,
      list.left - (box.left - ring),
      box.right + ring - list.right,
    )
  })
}
