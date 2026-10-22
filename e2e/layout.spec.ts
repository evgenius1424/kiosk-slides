import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fonts, scales } from '@/lib/presentation'
import { expect, test } from './fixtures'

const CLEAR = 2.5
const CLEAR_WHEN_FULL = 1
const MIN_TEXT_FIT = '0.6'
const RENDER = 'skills/kiosk-slides/scripts/render.mjs'

const samples = [
  ...readdirSync('e2e/layout').map(file => path.join('e2e/layout', file)),
  'public/example.md',
]

test.use({ viewport: { width: 1600, height: 900 } })

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
