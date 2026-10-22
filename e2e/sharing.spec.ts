import type { Browser, Page } from '@playwright/test'
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
})

test('a share link opens the same slides read-only, and Keep a copy saves them', async ({
  page,
  browser,
}) => {
  await page.getByRole('button', { name: 'Share' }).click()
  const link = await page.getByRole('textbox', { name: 'Link to these slides' }).inputValue()
  await page.getByRole('button', { name: 'Copy link' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link)
  await expect(page.getByText('Link copied')).toBeVisible()

  const friend = await visit(browser, page, link)
  await expect(friend.getByText('Share link', { exact: true })).toBeVisible()
  await expect(slideList(friend)).toHaveCount(3)
  await expect(friend.getByRole('button', { name: 'Edit', exact: true })).toBeHidden()
  await friend.getByRole('button', { name: 'Keep a copy' }).click()
  await expect(friend.getByText('Share link', { exact: true })).toBeHidden()
  await expect(friend.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
  expect((await stored(friend)).map(p => p.source)).toContain(three)
})

test('a share link follows the slide number', async ({ page, browser }) => {
  const link = await shareLink(page)
  const friend = await visit(browser, page, `${link}&3`)
  await expect(shownSlide(friend)).toHaveAccessibleName(/^Slide 3 of 3/)
  await friend.getByRole('button', { name: 'Previous slide' }).click()
  await expect(friend).toHaveURL(new RegExp(`${new URL(link).hash}&2$`))
})

test('opening your own link shows your saved copy', async ({ page, context }) => {
  const link = await shareLink(page)
  const again = await context.newPage()
  await again.goto(new URL(link).hash.replace(/^/, '/'))
  await expect(again.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
  await expect(again.getByText('Share link', { exact: true })).toBeHidden()
})

test('a pasted presentation replaces a shared view', async ({ page, browser }) => {
  const friend = await visit(browser, page, await shareLink(page))
  await expect(friend.getByText('Share link', { exact: true })).toBeVisible()
  await paste(friend, '# Pasted\n')
  await expect(friend.getByText('Share link', { exact: true })).toBeHidden()
  await expect(slideList(friend)).toHaveCount(1)
  expect(friend.url()).not.toContain('#s=')
  expect((await stored(friend)).map(p => p.source)).toContain('# Pasted\n')
})

test('opening a share link leaves the open presentation untouched', async ({ page, context }) => {
  const link = await shareLink(page)
  await editSource(page, '# Changed after sharing\n')
  await page.close()
  for (const hash of [new URL(link).hash, '#s=abc']) {
    const tab = await context.newPage()
    await tab.goto(`/${hash}`)
    await expect(tab.getByRole('main')).toBeVisible()
    await tab.waitForTimeout(500)
    expect((await stored(tab)).map(p => p.source)).toEqual(['# Changed after sharing\n'])
    await tab.close()
  }
})

test('a cut-off link says so', async ({ page }) => {
  await page.goto('/#s=abc')
  await expect(page.getByText('This link is incomplete. Ask for it again.')).toBeVisible()
  await page.getByRole('link', { name: 'Go to my presentations' }).click()
  await expect(slideList(page)).toHaveCount(3)
})

async function shareLink(page: Page) {
  await page.getByRole('button', { name: 'Share' }).click()
  const link = await page.getByRole('textbox', { name: 'Link to these slides' }).inputValue()
  await page.getByRole('button', { name: 'Close' }).click()
  return link
}

async function visit(browser: Browser, page: Page, link: string) {
  const context = await browser.newContext()
  const friend = await context.newPage()
  await friend.goto(new URL(new URL(link).hash, page.url()).href)
  return friend
}
