import { execFileSync } from 'node:child_process'
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { presentationHtml } from '@/components/slide/presentation-html'
import { parsePresentation } from '@/lib/presentation'
import { shareLink } from '@/lib/share'
import { SITE_URL } from '@/lib/site'
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
    render('example.html', '--font', 'inter', '--tone', 'teal', '--transition', 'slide')
    const presentation = parsePresentation(await readFile('public/example.md', 'utf8'))
    const site = await presentationHtml(
      { ...presentation, font: 'inter' },
      {
        tone: '#669a98',
        transition: 'slide',
        site: SITE_URL,
        embedImage: src => dataUrl(`public${src}`, 'image/png'),
        embedFont: file => dataUrl(`public/fonts/${file}`, 'font/woff2'),
      },
    )
    expect(await readFile(path.join(dir, 'example.html'), 'utf8')).toBe(site)
  })

  it('prints the same share link as the site', async () => {
    const link = await shareLink(await readFile('public/example.md', 'utf8'), SITE_URL)
    expect(link).toHaveProperty('url')
    expect(render('linked.html').split('\n')).toContain(
      `Open in your browser: ${(link as { url: string }).url}`,
    )
    expect(render('quiet.html', '--no-link')).not.toContain('Open in your browser')
  })

  it('credits the site in the download unless --no-credit', async () => {
    render('credited.html')
    render('plain.html', '--no-credit')
    expect(await readFile(path.join(dir, 'credited.html'), 'utf8')).toContain(
      `"credit":${JSON.stringify(SITE_URL)}`,
    )
    expect(await readFile(path.join(dir, 'plain.html'), 'utf8')).toContain('"credit":""')
  })
})

function render(out: string, ...options: string[]) {
  const script = path.join(dir, 'scripts/render.mjs')
  const args = [script, path.join(dir, 'example.md'), '-o', path.join(dir, out), ...options]
  return execFileSync('node', args, { encoding: 'utf8' })
}

async function dataUrl(file: string, type: string) {
  return `data:${type};base64,${(await readFile(file)).toString('base64')}`
}
