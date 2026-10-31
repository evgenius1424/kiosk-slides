import { readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { themes } from '@/lib/presentation'
import { example, expect, openSaved, test } from './fixtures'

const WIDTH = 1920
const HEIGHT = 1080
const BLOCK = 8
const MAX_BLOCK_DIFF = 32

for (const theme of themes)
  test(`every PDF page matches its slide in the ${theme} theme`, async ({ page, browser }) => {
    test.slow()
    const source = example.replace(/^theme: .*$/m, `theme: ${theme}`)
    await openSaved(page, { id: 'mine', name: 'Example talk', source })
    const html = await download(page, 'Web page')
    const pages = jpegPages(await readFile(await download(page, 'PDF'), 'latin1'))

    const view = await browser.newPage({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 1,
    })
    await view.goto(`file://${html}`)
    const count = await view.locator('.slide-frame').count()
    expect(pages).toHaveLength(count)

    const mismatches: string[] = []
    for (const [i, jpeg] of pages.entries()) {
      await view.goto(`file://${html}`)
      await view.evaluate(showOnly, { index: i, width: WIDTH, height: HEIGHT })
      await view.evaluate(() => document.fonts.ready)
      const shot = await view.screenshot()
      const worst = await view.evaluate(blockDiff, {
        expected: `data:image/png;base64,${shot.toString('base64')}`,
        actual: `data:image/jpeg;base64,${jpeg.toString('base64')}`,
        width: WIDTH,
        height: HEIGHT,
        block: BLOCK,
      })
      if (worst.diff > MAX_BLOCK_DIFF) {
        await test
          .info()
          .attach(`slide-${i + 1}-site.png`, { body: shot, contentType: 'image/png' })
        await test.info().attach(`slide-${i + 1}-pdf.jpg`, {
          body: jpeg,
          contentType: 'image/jpeg',
        })
        mismatches.push(
          `slide ${i + 1}: differs by ${worst.diff.toFixed(1)} around x ${worst.x}, y ${worst.y}`,
        )
      }
    }
    await view.close()
    expect(mismatches).toEqual([])
  })

async function download(page: Page, format: 'Web page' | 'PDF') {
  await page.getByRole('button', { name: 'Download' }).click()
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: new RegExp(`^${format}`) }).click(),
  ])
  const path = test.info().outputPath(file.suggestedFilename())
  await file.saveAs(path)
  return path
}

function jpegPages(pdf: string) {
  return [...pdf.matchAll(/\/Filter \/DCTDecode \/Length (\d+) >>\nstream\n/g)].map(match => {
    const start = match.index + match[0].length
    return Buffer.from(pdf.slice(start, start + Number(match[1])), 'latin1')
  })
}

function showOnly({ index, width, height }: { index: number; width: number; height: number }) {
  const frame = document.querySelectorAll('.slide-frame')[index]
  const root = document.createElement('div')
  root.className = document.body.className
  root.setAttribute(
    'style',
    `${document.body.getAttribute('style') ?? ''};width:${width}px;height:${height}px;overflow:hidden`,
  )
  const slide = frame.cloneNode(true) as HTMLElement
  slide.style.cssText = `width:${width}px;height:${height}px;container-type:inline-size`
  root.append(slide)
  document.body.style.margin = '0'
  document.body.replaceChildren(root)
}

async function blockDiff({
  expected,
  actual,
  width,
  height,
  block,
}: {
  expected: string
  actual: string
  width: number
  height: number
  block: number
}) {
  const pixels = async (src: string) => {
    const image = new Image()
    image.src = src
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')!
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, width, height)
    return context.getImageData(0, 0, width, height).data
  }
  const [a, b] = await Promise.all([pixels(expected), pixels(actual)])
  let worst = { diff: 0, x: 0, y: 0 }
  for (let y = 0; y < height; y += block)
    for (let x = 0; x < width; x += block) {
      const sum = [0, 0, 0]
      for (let dy = 0; dy < block; dy++)
        for (let dx = 0; dx < block; dx++) {
          const i = ((y + dy) * width + x + dx) * 4
          for (let c = 0; c < 3; c++) sum[c] += a[i + c] - b[i + c]
        }
      const diff = Math.max(...sum.map(Math.abs)) / (block * block)
      if (diff > worst.diff) worst = { diff, x, y }
    }
  return worst
}
