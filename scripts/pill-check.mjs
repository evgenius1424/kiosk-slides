import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { build } from 'esbuild'
import { chromium } from '@playwright/test'

const LIMITS = { gap: 0.08, clear: 0.02, poke: 0, balance: 0.015, side: 0.02, height: 2, merged: 0 }
const PROBE_BASE =
  '.slide{background:#fff!important}.slide *{background-color:transparent!important;background-image:none!important;box-shadow:none!important;text-shadow:none!important;border-color:transparent!important;outline:none!important;text-decoration:none!important}.slide::before,.slide::after,.slide *::before,.slide *::after{display:none!important}'
const STATES = {
  pill: `${PROBE_BASE}.slide *{visibility:hidden!important}.slide h2 strong{visibility:visible!important;background:#000!important}`,
  ink: `${PROBE_BASE}.slide h2 strong{background:transparent!important}.slide *{color:#000!important}`,
  own: `${PROBE_BASE}.slide *{visibility:hidden!important}.slide h2 strong,.slide h2 strong *{visibility:visible!important;color:#000!important}.slide h2 strong{background:transparent!important}`,
}

const { values } = parseArgs({
  options: {
    source: { type: 'string', default: 'scripts/theme-lab/pill-cases.md' },
    out: { type: 'string', default: '.theme-lab/pill-check' },
    themes: { type: 'string', default: 'marker,poster' },
    fonts: { type: 'string' },
    scales: { type: 'string', default: 'normal,large,hero' },
    widths: { type: 'string', default: '1920,1280,860,390' },
    dpr: { type: 'string', default: '2' },
  },
})

const root = process.cwd()
const out = path.resolve(values.out)
await mkdir(path.join(out, 'shots'), { recursive: true })
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
const { labPage, labFonts, PILL_PAD } = await import(bundle)
const source = await readFile(values.source, 'utf8')
const dpr = Number(values.dpr)
const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
)
const lab = await browser.newPage()
const results = []

for (const theme of values.themes.split(','))
  for (const font of values.fonts?.split(',') ?? labFonts)
    for (const scale of values.scales.split(','))
      for (const width of values.widths.split(',').map(Number)) {
        const name = `${theme}-${font}-${scale}-${width}`
        const html = path.join(out, `${name}.html`)
        await writeFile(html, labPage(source, root, { theme, scale, width, font }))
        const page = await browser.newPage({
          viewport: { width, height: Math.round((width * 9) / 16) },
          deviceScaleFactor: dpr,
        })
        await page.goto(`file://${html}`)
        await page.evaluate(() => document.fonts.ready)
        const frames = await page.evaluate(headings)
        for (const frame of frames) {
          if (!frame.fragments) continue
          const shots = {}
          for (const [state, css] of Object.entries(STATES)) {
            await page.evaluate(setProbe, css)
            shots[state] = (await page.screenshot({ clip: frame.clip, fullPage: true })).toString(
              'base64',
            )
          }
          await page.evaluate(setProbe, '')
          const found = await lab.evaluate(analyze, {
            ...shots,
            em: frame.em * dpr,
            fragments: frame.fragments,
            pad: PILL_PAD,
          })
          const failures = Object.entries(found)
            .filter(([check, value]) => failed(check, value))
            .map(([check]) => check)
          const result = { name, theme, font, scale, width, slide: frame.slide, ...found, failures }
          if (failures.length) {
            result.shot = `${name}-${frame.slide}.png`
            await page.screenshot({
              clip: frame.clip,
              fullPage: true,
              path: path.join(out, 'shots', result.shot),
            })
          }
          results.push(result)
        }
        await page.close()
        const failing = results.filter(r => r.name === name && r.failures.length)
        console.log(
          `${name}: ${failing.length ? failing.map(r => `${r.slide} ${r.failures.join('+')}`).join(', ') : 'ok'}`,
        )
      }

await browser.close()
await writeFile(path.join(out, 'report.json'), JSON.stringify(results, null, 2))
for (const check of Object.keys(LIMITS)) {
  const bad = results.filter(r => r.failures.includes(check))
  const worst = bad.sort((a, b) => severity(check, b[check]) - severity(check, a[check]))[0]
  console.log(
    `${check}: ${bad.length}/${results.length}${worst ? ` worst ${worst[check]} at ${worst.name} slide ${worst.slide}` : ''}`,
  )
}

function failed(check, value) {
  if (check === 'gap' || check === 'clear') return value < LIMITS[check]
  if (check in LIMITS) return Number(value) > LIMITS[check]
  return false
}

function severity(check, value) {
  return check === 'gap' || check === 'clear' ? -value : value
}

function setProbe(css) {
  let probe = document.getElementById('probe')
  if (!probe) {
    probe = document.createElement('style')
    probe.id = 'probe'
    document.head.append(probe)
  }
  probe.textContent = css
}

function headings() {
  return [...document.querySelectorAll('.frame')].map((frame, i) => {
    const heading = frame.querySelector('h2')
    const pills = heading ? [...heading.querySelectorAll('strong')] : []
    if (!pills.length) return { slide: i + 1 }
    const em = parseFloat(getComputedStyle(heading).fontSize)
    const box = heading.getBoundingClientRect()
    const bounds = frame.getBoundingClientRect()
    const x = Math.max(bounds.left, box.left - em)
    const y = Math.max(bounds.top, box.top - em)
    return {
      slide: i + 1,
      em,
      fragments: pills.reduce((sum, pill) => sum + pill.getClientRects().length, 0),
      clip: {
        x,
        y,
        width: Math.min(bounds.right, box.right + em) - x,
        height: Math.min(bounds.bottom, box.bottom + em) - y,
      },
    }
  })
}

async function analyze({ pill, ink, own, em, fragments, pad }) {
  const load = async data => {
    const bitmap = await createImageBitmap(
      await (await fetch(`data:image/png;base64,${data}`)).blob(),
    )
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d')
    context.drawImage(bitmap, 0, 0)
    return context.getImageData(0, 0, bitmap.width, bitmap.height)
  }
  const [pillImage, inkImage, ownImage] = await Promise.all([pill, ink, own].map(load))
  const { width, height } = pillImage
  const size = width * height
  const mask = (image, test) => {
    const result = new Uint8Array(size)
    for (let i = 0; i < size; i++) {
      const [r, g, b] = image.data.subarray(i * 4, i * 4 + 3)
      result[i] = test(r, g, b) ? 1 : 0
    }
    return result
  }
  const pillMask = mask(pillImage, (r, g, b) => r + g + b < 384)
  const inkMask = mask(inkImage, (r, g, b) => Math.min(r, g, b) < 160)
  const ownMask = mask(ownImage, (r, g, b) => Math.min(r, g, b) < 160)
  const labels = new Int32Array(size).fill(-1)
  const parts = []
  for (let start = 0; start < size; start++) {
    if (!pillMask[start] || labels[start] >= 0) continue
    const part = { left: width, right: 0, top: height, bottom: 0, pixels: [] }
    const stack = [start]
    labels[start] = parts.length
    while (stack.length) {
      const p = stack.pop()
      const x = p % width
      const y = (p - x) / width
      part.pixels.push(p)
      part.left = Math.min(part.left, x)
      part.right = Math.max(part.right, x)
      part.top = Math.min(part.top, y)
      part.bottom = Math.max(part.bottom, y)
      for (const q of [p - 1, p + 1, p - width, p + width])
        if (q >= 0 && q < size && Math.abs((q % width) - x) <= 1 && pillMask[q] && labels[q] < 0) {
          labels[q] = parts.length
          stack.push(q)
        }
    }
    if (part.pixels.length > em * em * 0.05) parts.push(part)
    else for (const p of part.pixels) labels[p] = -2
  }
  const outside = distances(pillMask, true)
  const inside = distances(pillMask, false)
  let gap = Infinity
  let poke = 0
  let clear = Infinity
  for (let i = 0; i < size; i++) {
    if (inkMask[i] && !ownMask[i]) gap = Math.min(gap, outside[i])
    if (ownMask[i] && !pillMask[i] && outside[i] > 1.5) poke++
    if (ownMask[i] && pillMask[i]) clear = Math.min(clear, inside[i])
  }
  const reach = Math.ceil(em * 0.3)
  for (const [n, part] of parts.entries()) {
    const x0 = Math.max(0, part.left - reach)
    const y0 = Math.max(0, part.top - reach)
    const w = Math.min(width, part.right + reach + 1) - x0
    const h = Math.min(height, part.bottom + reach + 1) - y0
    const window = new Uint8Array(w * h)
    for (const p of part.pixels) window[(Math.floor(p / width) - y0) * w + (p % width) - x0] = 1
    const near = distances(window, true, w, h)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const label = labels[(y + y0) * width + x + x0]
        if (label >= 0 && label !== n) gap = Math.min(gap, near[y * w + x])
      }
  }
  let balance = 0
  let side = 0
  for (const part of parts) {
    let first = width
    let last = -1
    for (const p of part.pixels)
      if (ownMask[p]) {
        first = Math.min(first, p % width)
        last = Math.max(last, p % width)
      }
    if (last < 0) continue
    const left = first - part.left
    const right = part.right - last
    balance = Math.max(balance, Math.max(Math.abs(left - right) - 1.5, 0) / em)
    side = Math.max(
      side,
      ...[left, right].map(gap => Math.max(Math.abs(gap - pad * em) - 1.5, 0) / em),
    )
  }
  const heights = parts.map(part => part.bottom - part.top)
  return {
    parts: parts.length,
    fragments,
    gap: round(gap / em),
    clear: round(clear / em),
    poke,
    balance: round(balance),
    side: round(side),
    height: parts.length ? Math.max(...heights) - Math.min(...heights) : 0,
    merged: parts.length < fragments,
  }

  function distances(source, toInk, width = pillImage.width, height = pillImage.height) {
    const grid = new Float64Array(width * height)
    for (let i = 0; i < grid.length; i++) grid[i] = source[i] === (toInk ? 1 : 0) ? 0 : 1e12
    const line = (get, set, n) => {
      const f = new Float64Array(n)
      for (let i = 0; i < n; i++) f[i] = get(i)
      const v = new Int32Array(n)
      const z = new Float64Array(n + 1)
      let k = 0
      z[0] = -Infinity
      z[1] = Infinity
      for (let q = 1; q < n; q++) {
        let s
        do {
          const r = v[k]
          s = (f[q] + q * q - (f[r] + r * r)) / (2 * q - 2 * r)
        } while (s <= z[k] && k-- > 0)
        k++
        v[k] = q
        z[k] = s
        z[k + 1] = Infinity
      }
      k = 0
      for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) k++
        set(q, (q - v[k]) ** 2 + f[v[k]])
      }
    }
    for (let x = 0; x < width; x++)
      line(
        y => grid[y * width + x],
        (y, d) => (grid[y * width + x] = d),
        height,
      )
    for (let y = 0; y < height; y++)
      line(
        x => grid[y * width + x],
        (x, d) => (grid[y * width + x] = d),
        width,
      )
    return grid.map(Math.sqrt)
  }

  function round(value) {
    return Math.round(value * 1000) / 1000
  }
}
