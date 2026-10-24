import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { build } from 'esbuild'
import { chromium } from '@playwright/test'

const CLEAR = 2.5
const CLEAR_WHEN_FULL = 1

const { values } = parseArgs({
  options: {
    source: { type: 'string', default: 'scripts/theme-lab/stress-test.md' },
    out: { type: 'string', default: '.theme-lab' },
    themes: { type: 'string' },
    scales: { type: 'string', default: 'normal' },
    widths: { type: 'string', default: '1920' },
    font: { type: 'string' },
    tone: { type: 'string' },
    'no-shots': { type: 'boolean', default: false },
  },
})

const root = process.cwd()
const out = path.resolve(values.out)
await mkdir(out, { recursive: true })
const bundle = path.join(out, 'render.mjs')
await build({
  entryPoints: ['scripts/theme-lab/render.tsx'],
  outfile: bundle,
  bundle: true,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  banner: { js: "import{createRequire}from'module';const require=createRequire(import.meta.url);" },
  logLevel: 'warning',
})
const { labPage, labThemes } = await import(bundle)
const source = await readFile(values.source, 'utf8')
const sample = path.basename(values.source, '.md')
const ids = values.themes?.split(',') ?? labThemes.map(t => t.id)
const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
)
const report = []

for (const theme of ids)
  for (const scale of values.scales.split(','))
    for (const width of values.widths.split(',').map(Number)) {
      const name = [sample, theme, scale, width, values.font, values.tone?.replace('#', '')]
        .filter(Boolean)
        .join('-')
      const html = path.join(out, `${name}.html`)
      await writeFile(
        html,
        labPage(source, root, { theme, scale, width, font: values.font, tone: values.tone }),
      )
      const page = await browser.newPage({
        viewport: { width, height: Math.round((width * 9) / 16) },
      })
      await page.goto(`file://${html}`)
      await page.evaluate(() => document.fonts.ready)
      const slides = await page.evaluate(measure)
      if (!values['no-shots']) {
        await mkdir(path.join(out, name), { recursive: true })
        const frames = await page.locator('.frame').all()
        for (const [i, frame] of frames.entries())
          await frame.screenshot({
            path: path.join(out, name, `${String(i + 1).padStart(2, '0')}.png`),
          })
      }
      await page.close()
      const problems = slides.filter(
        s =>
          s.wide ||
          s.label < (s.fit === '0.6' ? CLEAR_WHEN_FULL : CLEAR) ||
          s.footer < (s.fit === '0.6' ? CLEAR_WHEN_FULL : CLEAR),
      )
      report.push({ name, theme, scale, width, slides, problems })
      console.log(
        `${name}: ${problems.length ? problems.map(p => `slide ${p.number} (${p.kind}) label ${p.label.toFixed(2)} footer ${p.footer.toFixed(2)}${p.wide ? ' too wide' : ''}`).join('; ') : 'ok'}`,
      )
    }

await browser.close()
await writeFile(path.join(out, `report-${sample}.json`), JSON.stringify(report, null, 2))

function measure() {
  return [...document.querySelectorAll('.frame')].map((frame, i) => {
    const slide = frame.querySelector('.slide')
    const bounds = slide.getBoundingClientRect()
    const cqw = bounds.width / 100
    const label = slide.querySelector('.slide-meta').getBoundingClientRect()
    const footer = slide.querySelector('.slide-footer').getBoundingClientRect()
    let top = Infinity
    let bottom = -Infinity
    let right = -Infinity
    const visit = element => {
      const style = getComputedStyle(element)
      const boxed =
        ['IMG', 'svg', 'TABLE', 'PRE'].includes(element.tagName) ||
        style.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
        parseFloat(style.borderTopWidth) > 0
      const text =
        style.display !== 'inline' &&
        [...element.childNodes].some(
          node => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
        )
      if (boxed || text) {
        const box = element.getBoundingClientRect()
        top = Math.min(top, box.top)
        bottom = Math.max(bottom, box.bottom)
        right = Math.max(right, box.right)
      }
      for (const child of element.children) visit(child)
    }
    visit(slide.querySelector('.slide-content'))
    return {
      number: i + 1,
      kind: frame.dataset.kind,
      label: (top - label.bottom) / cqw,
      footer: (footer.top - bottom) / cqw,
      wide: right > bounds.right - 2 * cqw,
      fit: slide.style.getPropertyValue('--text-fit'),
      heading: slide.style.getPropertyValue('--heading-size'),
    }
  })
}
