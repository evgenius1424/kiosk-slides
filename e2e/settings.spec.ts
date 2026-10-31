import {
  editSource,
  expect,
  openSaved,
  paste,
  shownSlide,
  slideList,
  stored,
  test,
  three,
} from './fixtures'

test.beforeEach(async ({ page }) => {
  await openSaved(page, { id: 'mine', name: 'Three slides', source: three })
  await page.getByRole('button', { name: 'Settings' }).click()
})

test('opening settings focuses the panel, not a picker', async ({ page }) => {
  const settings = page.getByRole('complementary', { name: 'Presentation settings' })
  await expect(settings).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(settings.getByRole('combobox', { name: 'Theme' })).toBeFocused()
})

test('writes each setting to the front matter and the slides follow', async ({ page }) => {
  const settings = page.getByRole('complementary', { name: 'Presentation settings' })
  await settings.getByRole('combobox', { name: 'Theme' }).selectOption({ label: 'Light' })
  await settings.getByRole('button', { name: 'Teal tone' }).click()
  await settings.getByRole('combobox', { name: 'Font' }).selectOption({ label: 'Inter' })
  await settings.getByRole('combobox', { name: 'Scale' }).selectOption('hero')
  await settings.getByRole('combobox', { name: 'Slide transition' }).selectOption('none')
  const slide = shownSlide(page).locator('article')
  await expect(slide).toHaveClass(/room-light/)
  await expect(slide).toHaveClass(/scale-hero/)
  await expect(slide).toHaveCSS('font-family', /Inter/)
  const source = (await stored(page))[0].source
  expect(source).toMatch(/^theme: room-light$/m)
  expect(source).toMatch(/^tone: teal$/m)
  expect(source).toMatch(/^font: inter$/m)
  expect(source).toMatch(/^scale: hero$/m)
  expect(source).toMatch(/^transition: none$/m)
})

test('changing the front matter by hand updates the settings', async ({ page }) => {
  await editSource(page, '---\ntheme: studio\nscale: large\n---\n\n# One\n')
  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('complementary', { name: 'Presentation settings' })
  await expect(settings.getByRole('combobox', { name: 'Theme' })).toHaveValue('studio')
  await expect(settings.getByRole('combobox', { name: 'Scale' })).toHaveValue('large')
})

test('the brand can be renamed or hidden', async ({ page }) => {
  const settings = page.getByRole('complementary', { name: 'Presentation settings' })
  await settings.getByRole('textbox', { name: 'Brand' }).fill('acme')
  await expect(shownSlide(page).locator('.slide-brand')).toHaveText('acme')
  await settings.getByRole('switch', { name: 'Show brand' }).click()
  await expect(shownSlide(page).locator('.slide-brand')).toHaveCount(0)
})

test('a new presentation starts in the style chosen last', async ({ page }) => {
  const settings = page.getByRole('complementary', { name: 'Presentation settings' })
  await settings.getByRole('button', { name: 'Violet tone' }).click()
  await settings.getByRole('combobox', { name: 'Scale' }).selectOption('hero')
  await paste(page, '---\ntheme: room-light\ntone: coral\n---\n\n# Pasted\n')
  await expect(page.getByText('Pasted as')).toBeVisible()
  const pasted = (await stored(page)).find(p => p.source.includes('# Pasted'))!
  expect(pasted.source).toBe('---\ntone: violet\nscale: hero\n---\n\n# Pasted\n')

  await page.reload()
  await page
    .getByRole('button', { name: /Three slides|Pasted/ })
    .first()
    .click()
  await page.getByRole('button', { name: 'New presentation' }).click()
  await page.getByRole('button', { name: 'Start blank' }).click()
  await expect(slideList(page).first().locator('article')).toHaveClass(/scale-hero/)
  const blank = (await stored(page)).at(-1)!
  expect(blank.source).toMatch(/^tone: violet$/m)
})
