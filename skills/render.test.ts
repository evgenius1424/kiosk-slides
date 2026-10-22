import { execFileSync } from 'node:child_process'
import { chmod, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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
        tone: '#4fd1c5',
        transition: 'slide',
        site: SITE_URL,
        embedImage: src => dataUrl(`public${src}`, 'image/png'),
        embedFont: file => dataUrl(`public/fonts/${file}`, 'font/woff2'),
      },
    )
    expect(await readFile(path.join(dir, 'example.html'), 'utf8')).toBe(site)
  })

  it.skipIf(process.platform === 'win32')(
    'opens the same share link as the site and never prints it',
    async () => {
      const link = await shareLink(await readFile('public/example.md', 'utf8'), SITE_URL)
      const url = (link as { url: string }).url
      const output = await renderWithBrowser('opened.html')
      expect(output.printed).toContain('Opened in your browser')
      expect(output.printed).not.toContain('https://')
      expect(output.opened).toBe(url)
      expect((await renderWithBrowser('local.html', '--no-link')).opened).toBe(
        path.join(dir, 'local.html'),
      )
      expect(render('quiet.html')).not.toContain('https://')
    },
  )

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
  return run(out, ['--no-open', ...options])
}

async function renderWithBrowser(out: string, ...options: string[]) {
  const bin = path.join(dir, 'bin')
  const log = path.join(dir, `${out}.opened`)
  await mkdir(bin, { recursive: true })
  for (const name of ['open', 'xdg-open']) {
    await writeFile(path.join(bin, name), `#!/bin/sh\nprintf '%s' "$1" > "$OPENED_LOG"\n`)
    await chmod(path.join(bin, name), 0o755)
  }
  const printed = run(out, options, {
    ...process.env,
    CI: '',
    SSH_CONNECTION: '',
    SSH_TTY: '',
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    DISPLAY: ':0',
    OPENED_LOG: log,
  })
  return { printed, opened: await waitForFile(log) }
}

function run(out: string, options: string[], env = process.env) {
  const script = path.join(dir, 'scripts/render.mjs')
  const args = [script, path.join(dir, 'example.md'), '-o', path.join(dir, out), ...options]
  return execFileSync('node', args, { encoding: 'utf8', env })
}

async function waitForFile(file: string) {
  for (let i = 0; i < 50; i++) {
    const text = await readFile(file, 'utf8').catch(() => undefined)
    if (text) return text
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

async function dataUrl(file: string, type: string) {
  return `data:${type};base64,${(await readFile(file)).toString('base64')}`
}
