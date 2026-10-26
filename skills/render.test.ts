import { execFile, execFileSync } from 'node:child_process'
import { chmod, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { presentationHtml } from '@/components/slide/presentation-html'
import { parsePresentation } from '@/lib/presentation'
import { shareLink } from '@/lib/share'
import { SITE_URL } from '@/lib/site'
import { bundleRenderer } from '@/scripts/bundle-renderer.mjs'

const execFileAsync = promisify(execFile)

let dir = ''
let site: Server
let siteUrl = ''

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'kiosk-render-'))
  await bundleRenderer(path.join(dir, 'scripts/render.mjs'))
  site = createServer((_, response) => response.end())
  await new Promise<void>(resolve => site.listen(0, '127.0.0.1', resolve))
  siteUrl = `http://127.0.0.1:${(site.address() as { port: number }).port}`
  await withSiteUrl(siteUrl, () => bundleRenderer(path.join(dir, 'scripts/render-local.mjs')))
  await cp('public/fonts', path.join(dir, 'assets/fonts'), { recursive: true })
  await cp('public/images', path.join(dir, 'images'), { recursive: true })
  await cp('public/example.md', path.join(dir, 'example.md'))
}, 30_000)
afterAll(async () => {
  site.close()
  await rm(dir, { recursive: true, force: true })
})

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
    'opens the same share link as the site when it is reachable and never prints it',
    async () => {
      const link = await shareLink(await readFile('public/example.md', 'utf8'), siteUrl)
      const output = await renderWithBrowser('opened.html')
      expect(output.printed).toContain('Opened in your browser')
      expect(output.printed).not.toContain('http://')
      expect(output.opened).toBe((link as { url: string }).url)
      expect((await renderWithBrowser('local.html', '--no-link')).opened).toBe(
        path.join(dir, 'local.html'),
      )
      expect(render('quiet.html')).not.toContain('https://')
    },
  )

  it.skipIf(process.platform === 'win32')(
    'opens the HTML file when the site is unreachable',
    async () => {
      await new Promise(resolve => site.close(resolve))
      expect((await renderWithBrowser('offline.html')).opened).toBe(path.join(dir, 'offline.html'))
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
  const script = path.join(dir, 'scripts/render-local.mjs')
  const { stdout: printed } = await execFileAsync('node', [script, ...renderArgs(out, options)], {
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: '',
      SSH_CONNECTION: '',
      SSH_TTY: '',
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      DISPLAY: ':0',
      OPENED_LOG: log,
    },
  })
  return { printed, opened: await waitForFile(log) }
}

function run(out: string, options: string[]) {
  const script = path.join(dir, 'scripts/render.mjs')
  return execFileSync('node', [script, ...renderArgs(out, options)], { encoding: 'utf8' })
}

function renderArgs(out: string, options: string[]) {
  return [path.join(dir, 'example.md'), '-o', path.join(dir, out), ...options]
}

async function waitForFile(file: string) {
  for (let i = 0; i < 50; i++) {
    const text = await readFile(file, 'utf8').catch(() => undefined)
    if (text) return text
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

async function withSiteUrl(url: string, task: () => Promise<unknown>) {
  const previous = process.env.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_SITE_URL = url
  try {
    await task()
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = previous
  }
}

async function dataUrl(file: string, type: string) {
  return `data:${type};base64,${(await readFile(file)).toString('base64')}`
}
