import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fonts, scales } from '@/lib/presentation'
import { expect, openSaved, shownSlide, test } from './fixtures'

const CLEAR = 2.5
const CLEAR_WHEN_FULL = 1
const MIN_TEXT_FIT = '0.6'
const RENDER = 'skills/kiosk-slides/scripts/render.mjs'

const samples = [
  ...readdirSync('e2e/layout').map(file => path.join('e2e/layout', file)),
  'public/example.md',
]

test.use({ viewport: { width: 1600, height: 900 } })

test.describe('phone preview', () => {
  test.use({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true })

  for (const sample of samples)
    test(`${path.basename(sample)} keeps every slide above the footer`, async ({ page }) => {
      const source = readFileSync(sample, 'utf8')
      await openSaved(page, { id: 'phone', name: 'Phone', source })
      await page.evaluate(() => document.fonts.ready)
      const name = await shownSlide(page).getAttribute('aria-label')
      const count = Number(name!.match(/of (\d+)/)![1])
      const problems: string[] = []
      for (let number = 1; number <= count; number++) {
        await page.goto(`/#${number}`)
        const slide = shownSlide(page)
        await expect(slide).toHaveAttribute('aria-label', new RegExp(`^Slide ${number} of`))
        const gap = await slide.evaluate(frame => {
          const content = frame.querySelector('.slide-content')!
          const footer = frame.querySelector('.slide-footer')!.getBoundingClientRect()
          const label = frame.querySelector('.slide-meta')!.getBoundingClientRect()
          const items = [...content.children].map(item => item.getBoundingClientRect())
          return {
            top: items[0].top - label.bottom,
            bottom: footer.top - items.at(-1)!.bottom,
          }
        })
        if (gap.top < 0 || gap.bottom < 0)
          problems.push(
            `slide ${number}: ${gap.top.toFixed(1)}px below the label, ${gap.bottom.toFixed(1)}px above the footer`,
          )
      }
      expect(problems).toEqual([])
    })
})

for (const sample of samples)
  for (const scale of scales)
    for (const font of fonts)
      test(`${path.basename(sample)} keeps clear of the label and footer at ${scale} scale in ${font.name}`, async ({
        page,
      }) => {
        const html = test.info().outputPath('slides.html')
        execFileSync('node', [
          RENDER,
          sample,
          '-o',
          html,
          '--scale',
          scale,
          '--font',
          font.id,
          '--no-motion',
          '--no-link',
        ])
        await page.goto(`file://${html}`)
        await page.evaluate(() => document.fonts.ready)
        const problems = (await page.evaluate(measure))
          .filter(({ fit, label, footer }) => {
            const need = fit === MIN_TEXT_FIT ? CLEAR_WHEN_FULL : CLEAR
            return label < need || footer < need
          })
          .map(
            ({ number, label, footer, fit }) =>
              `slide ${number}: ${label.toFixed(2)}cqw below the label, ${footer.toFixed(2)}cqw above the footer${fit ? `, text fit ${fit}` : ''}`,
          )
        expect(problems).toEqual([])
      })

function measure() {
  const slides = [...document.querySelectorAll<HTMLElement>('.portable-slide')]
  return slides.map((shown, i) => {
    slides.forEach(slide => slide.classList.toggle('active', slide === shown))
    const slide = shown.querySelector<HTMLElement>('.slide')!
    const cqw = slide.getBoundingClientRect().width / 100
    const label = slide.querySelector('.slide-meta')!.getBoundingClientRect()
    const footer = slide.querySelector('.slide-footer')!.getBoundingClientRect()
    let top = Infinity
    let bottom = -Infinity
    const visit = (element: Element) => {
      const style = getComputedStyle(element)
      const boxed =
        ['IMG', 'svg', 'TABLE', 'PRE'].includes(element.tagName) ||
        style.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
        parseFloat(style.borderTopWidth) > 0
      const text =
        style.display !== 'inline' &&
        [...element.childNodes].some(
          node => node.nodeType === Node.TEXT_NODE && node.textContent!.trim(),
        )
      if (boxed || text) {
        const box = element.getBoundingClientRect()
        top = Math.min(top, box.top)
        bottom = Math.max(bottom, box.bottom)
      }
      for (const child of element.children) visit(child)
    }
    visit(slide.querySelector('.slide-content')!)
    return {
      number: i + 1,
      label: (top - label.bottom) / cqw,
      footer: (footer.top - bottom) / cqw,
      fit: slide.style.getPropertyValue('--text-fit'),
    }
  })
}
