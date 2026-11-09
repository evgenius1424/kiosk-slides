import type { Page } from '@playwright/test'
import { expect, openSaved, shownSlide, test } from './fixtures'

const MOVING = ['gentle', 'slide'] as const
const ALL = [...MOVING, 'fade'] as const

for (const transition of ALL)
  test(`${transition} fades the slides`, async ({ page }) => {
    await open(page, transition)
    const frames = await change(page)
    expect(frames.some(f => f.enter > 0.05 && f.enter < 0.95)).toBe(true)
    expect(frames.some(f => f.leave > 0.05 && f.leave < 0.95)).toBe(true)
  })

for (const transition of MOVING) {
  test(`${transition} moves the slides`, async ({ page }) => {
    await open(page, transition)
    expect((await change(page)).some(f => f.moving)).toBe(true)
  })

  test(`${transition} fades in place when the device reduces motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page, transition)
    const frames = await change(page)
    expect(frames.some(f => f.enter > 0.05 && f.enter < 0.95)).toBe(true)
    expect(frames.some(f => f.leave > 0.05 && f.leave < 0.95)).toBe(true)
    expect(frames.some(f => f.moving)).toBe(false)
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByText('Your device is set to reduce motion')).toBeVisible()
  })
}

async function open(page: Page, transition: string) {
  const source = `---\ntitle: Moving\ntransition: ${transition}\n---\n\n# One\n\n---\n\n# Two\n`
  await openSaved(page, { id: 'moving', name: 'Moving', source })
  await expect(page.locator('main.workspace')).not.toHaveClass(/is-loading/)
}

async function change(page: Page) {
  const frames = page.evaluate(
    () =>
      new Promise<{ enter: number; leave: number; moving: boolean }[]>(resolve => {
        const frames: { enter: number; leave: number; moving: boolean }[] = []
        const start = performance.now()
        const sample = () => {
          const enter = document.querySelector('.kt-enter')
          const leave = document.querySelector('.kt-leave')
          if (enter && leave)
            frames.push({
              enter: Number(getComputedStyle(enter).opacity),
              leave: Number(getComputedStyle(leave).opacity),
              moving: [enter, leave].some(e => getComputedStyle(e).transform !== 'none'),
            })
          const done = frames.length > 0 && !enter
          if (done || performance.now() - start > 5000) resolve(frames)
          else requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      }),
  )
  await page.keyboard.press('ArrowRight')
  await expect(shownSlide(page)).toHaveAccessibleName(/^Slide 2 of 2/)
  return frames
}
