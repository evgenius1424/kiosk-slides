import { execFileSync } from 'node:child_process'
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { presentationHtml } from '@/components/slide/presentation-html'
import { parsePresentation } from '@/lib/presentation'
import { bundleRenderer } from '@/scripts/bundle-renderer.mjs'

let dir = ''

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'kiosk-render-'))
  await bundleRenderer(path.join(dir, 'scripts/render.mjs'))
  await cp('public/fonts', path.join(dir, 'assets/fonts'), { recursive: true })
  await cp('public/images', path.join(dir, 'images'), { recursive: true })
  await cp('public/example.md', path.join(dir, 'example.md'))
}, 30_000)
afterAll(() => rm(dir, { recursive: true, force: true }))

describe('skill renderer', () => {
  it('writes the same HTML as the site export, whichever compiler built it', async () => {
    const out = path.join(dir, 'example.html')
    execFileSync('node', [
      path.join(dir, 'scripts/render.mjs'),
      path.join(dir, 'example.md'),
      '-o',
      out,
      '--font',
      'inter',
      '--tone',
      'teal',
      '--transition',
      'slide',
    ])
    const presentation = parsePresentation(await readFile('public/example.md', 'utf8'))
    const site = await presentationHtml(
      { ...presentation, font: 'inter' },
      {
        tone: '#669a98',
        transition: 'slide',
        embedImage: src => dataUrl(`public${src}`, 'image/png'),
        embedFont: file => dataUrl(`public/fonts/${file}`, 'font/woff2'),
      },
    )
    expect(await readFile(out, 'utf8')).toBe(site)
  })
})

async function dataUrl(file: string, type: string) {
  return `data:${type};base64,${(await readFile(file)).toString('base64')}`
}
