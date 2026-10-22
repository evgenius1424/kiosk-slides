import { readFileSync } from 'node:fs'
import { expect, test as base, type Page } from '@playwright/test'

export { expect }

export const STORE_KEY = 'kiosk-presentations'

export const example = readFileSync('public/example.md', 'utf8')

export const three = '---\ntitle: Three slides\n---\n\n# One\n\n---\n\n# Two\n\n---\n\n# Three\n'

export type Saved = { id: string; name: string; source: string }

export const test = base.extend<{ hosted: void }>({
  hosted: [
    async ({ page }, use) => {
      await page.route('**/api/chatgpt/status', route =>
        route.fulfill({ json: { available: false } }),
      )
      await use()
    },
    { auto: true },
  ],
})

export async function openSaved(page: Page, ...items: Saved[]) {
  await page.addInitScript(
    ({ key, items }) => {
      if (sessionStorage.getItem('e2e-seeded')) return
      sessionStorage.setItem('e2e-seeded', '1')
      localStorage.setItem(
        key,
        JSON.stringify({
          current: items[0].id,
          items: items.map(item => ({ ...item, userNamed: true, updatedAt: 1 })),
        }),
      )
    },
    { key: STORE_KEY, items },
  )
  await page.goto('/')
  await expect(page.getByRole('button', { name: items[0].name, exact: true })).toBeVisible()
}

export async function stored(page: Page): Promise<Saved[]> {
  return page.evaluate(
    key => JSON.parse(localStorage.getItem(key) ?? '{"items":[]}').items,
    STORE_KEY,
  )
}

export async function paste(page: Page, text: string) {
  await page.evaluate(text => {
    const data = new DataTransfer()
    data.setData('text/plain', text)
    document.body.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    )
  }, text)
}

export function slideList(page: Page) {
  return page.getByRole('navigation', { name: 'Slides' }).getByRole('button')
}

export function shownSlide(page: Page) {
  return page.getByRole('region', { name: /^Slide \d+ of \d+/ })
}

export async function editSource(page: Page, source: string) {
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByRole('textbox', { name: 'Presentation source' }).fill(source)
}
