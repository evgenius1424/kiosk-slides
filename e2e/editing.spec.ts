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

test('keeps the cursor on the same word after cleaning up', async ({ page }) => {
  const filler = Array.from({ length: 30 }, (_, i) => `# Slide ${i}\n\n\n\n`).join('---\n')
  await editSource(page, `${filler}---\n# Table\n|Name|Owner|\n|-|-|\n|Ana|Me|\n`)
  const editor = page.getByRole('textbox', { name: 'Presentation source' })
  const caret = () =>
    editor.evaluate((el: HTMLTextAreaElement) => {
      const top = el.value.slice(0, el.selectionStart).split('\n').length
      const height = parseFloat(getComputedStyle(el).lineHeight)
      return {
        before: el.value.slice(el.selectionStart - 2, el.selectionStart),
        selected: el.value.slice(el.selectionStart, el.selectionEnd),
        shown: Math.round((top * height - el.scrollTop) / height),
      }
    })
  await editor.evaluate((el: HTMLTextAreaElement) => {
    const at = el.value.indexOf('Owner')
    el.setSelectionRange(at + 2, at + 4)
    el.scrollTop = el.scrollHeight
  })
  const was = await caret()
  expect(was).toMatchObject({ before: 'Ow', selected: 'ne' })
  await page.getByRole('button', { name: 'Clean up' }).click()
  await expect(editor).toHaveValue(/\| Name \| Owner \|/)
  await expect(editor).toBeFocused()
  await expect.poll(caret).toEqual({ ...was, shown: expect.any(Number) })
  expect(Math.abs((await caret()).shown - was.shown)).toBeLessThanOrEqual(1)
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible()
})

test('moves through slides with the slide list keys', async ({ page }) => {
  await slideList(page).first().click()
  await page.keyboard.press('ArrowDown')
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 2 of 3/)
  await expect(slideList(page).nth(1)).toBeFocused()
  await page.keyboard.press('End')
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 3 of 3/)
})

test('duplicates, moves and drags slides, then undoes and redoes', async ({ page }) => {
  const names = () => slideList(page).locator('.thumbnail h2').allTextContents()
  await slideList(page).first().click()
  await page.keyboard.press('ControlOrMeta+d')
  await expect(slideList(page)).toHaveCount(4)
  await expect(slideList(page).nth(1)).toBeFocused()
  await page.keyboard.press('ControlOrMeta+ArrowDown')
  await expect.poll(names).toEqual(['One', 'Two', 'One', 'Three'])
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 3 of 4/)
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(names).toEqual(['One', 'One', 'Two', 'Three'])
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect.poll(names).toEqual(['One', 'Two', 'One', 'Three'])
  await slideList(page)
    .nth(3)
    .dragTo(slideList(page).first(), { targetPosition: { x: 20, y: 4 } })
  await expect.poll(names).toEqual(['Three', 'One', 'Two', 'One'])
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 1 of 4/)
  await page.reload()
  await expect.poll(names).toEqual(['Three', 'One', 'Two', 'One'])
})

test('moves a slide from the slide menu', async ({ page }) => {
  await slideList(page).first().click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Move down' }).click()
  await expect(slideList(page).nth(1)).toContainText('One')
  await expect(page.getByText('Slide moved to 2')).toBeVisible()
})

test('adds a slide with the keyboard', async ({ page }) => {
  await slideList(page).first().click()
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(slideList(page)).toHaveCount(4)
  await expect(page.getByRole('textbox', { name: 'Presentation source' })).toContainText(
    'New slide',
  )
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
