import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { deflateRawSync } from 'node:zlib'
import {
  fontId,
  fonts,
  formatPresentation,
  headingText,
  isScale,
  isTheme,
  isTransition,
  parsePresentation,
  reviewPresentation,
  scales,
  setPresentationTheme,
  themes,
  toneColor,
  toneHint,
  transitions,
  type Presentation,
} from '@/lib/presentation'
import { presentationHtml, fetchAsDataUrl } from '@/components/slide/presentation-html'
import { shareLink } from '@/lib/share'
import { SITE_URL } from '@/lib/site'

const SITE_TIMEOUT_MS = 2000
const OPEN_WAIT_MS = 1500

const usage =
  'Usage: render.mjs slides.md [-o slides.html] [--theme room-dark|room-light|studio] [--tone mono|violet|coral|teal|amber|#hex] [--font name] [--scale normal|large|hero] [--brand text|none] [--images dir] [--transition gentle|fade|slide|none] [--share-safe] [--no-motion] [--no-credit] [--no-link] [--no-open] [--check] [--format]'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', short: 'o' },
    theme: { type: 'string' },
    tone: { type: 'string' },
    font: { type: 'string' },
    scale: { type: 'string' },
    brand: { type: 'string' },
    images: { type: 'string' },
    transition: { type: 'string' },
    'share-safe': { type: 'boolean' },
    'no-motion': { type: 'boolean', default: false },
    'no-credit': { type: 'boolean', default: false },
    'no-link': { type: 'boolean', default: false },
    'no-open': { type: 'boolean', default: false },
    check: { type: 'boolean', default: false },
    format: { type: 'boolean', default: false },
  },
})

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

async function main() {
  const input = positionals[0]
  if (!input) throw new Error(usage)
  const wantsLink = !values.check && !values['no-open'] && !values['no-link']
  const reachable = wantsLink ? siteReachable() : Promise.resolve(false)
  const source = await readFile(input, 'utf8')
  if (values.theme !== undefined && !isTheme(values.theme))
    throw new Error(`Unknown theme “${values.theme}”. Use ${themes.join(' or ')}.`)
  const presentation = withLook(
    parsePresentation(values.theme ? setPresentationTheme(source, values.theme) : source),
  )
  if (values.format) await writeFile(input, formatPresentation(source))
  if (values.check) {
    console.log(summary(presentation))
    reviewPresentation(presentation).forEach(problem => console.log(`Warning: ${problem}`))
    return
  }
  const theme = presentation.theme
  const tone = values.tone === undefined ? presentation.tone : toneColor(values.tone, theme)
  if (!tone) throw new Error(`Unknown tone “${values.tone}”. ${toneHint}`)
  const transition = values['no-motion'] ? 'none' : (values.transition ?? presentation.transition)
  if (!isTransition(transition))
    throw new Error(`Unknown transition “${transition}”. Use ${transitions.join(', ')}.`)
  const imageDir = values.images ?? path.dirname(path.resolve(input))
  const html = await presentationHtml(presentation, {
    theme,
    tone,
    transition,
    shareSafe: values['share-safe'] ?? presentation.shareSafe,
    site: SITE_URL,
    embedImage: src => embed(src, imageDir),
    embedFont,
  })
  const out = values.out ?? input.replace(/\.(md|markdown)$/i, '') + '.html'
  await writeFile(out, html)
  console.log(`${summary(presentation)}\nWrote ${out}`)
  if (values['no-open']) return
  const link = (await reachable) ? await shareUrl(source) : undefined
  if (await openInBrowser(link ?? path.resolve(out))) console.log('Opened in your browser')
}

function withLook(presentation: Presentation): Presentation {
  const font = values.font ? fontId(values.font) : presentation.font
  if (!font)
    throw new Error(`Unknown font “${values.font}”. Use ${fonts.map(f => f.id).join(', ')}.`)
  const scale = values.scale ?? presentation.scale
  if (!isScale(scale)) throw new Error(`Unknown scale “${scale}”. Use ${scales.join(', ')}.`)
  const brand =
    values.brand === undefined ? presentation.brand : values.brand === 'none' ? '' : values.brand
  const credit = presentation.credit && !values['no-credit']
  return { ...presentation, font, scale, brand, credit }
}

async function shareUrl(source: string) {
  const link = await shareLink(source, SITE_URL, bytes => deflateRawSync(bytes))
  return 'url' in link ? link.url : undefined
}

function siteReachable() {
  const env = process.env
  const proxied = Boolean(env.HTTPS_PROXY || env.https_proxy || env.ALL_PROXY || env.all_proxy)
  return fetch(SITE_URL, { method: 'HEAD', signal: AbortSignal.timeout(SITE_TIMEOUT_MS) })
    .then(response => response.ok)
    .catch(() => proxied)
}

async function openInBrowser(target: string) {
  for (const [command, args] of browserCommands())
    if (await launch(command, [...args, target])) return true
  return false
}

function browserCommands() {
  const env = process.env
  const commands: [string, string[]][] = []
  if (env.CI || env.SSH_CONNECTION || env.SSH_TTY) return commands
  if (process.platform === 'darwin') commands.push(['open', []])
  else if (process.platform === 'win32')
    commands.push(['rundll32', ['url.dll,FileProtocolHandler']])
  else {
    if (env.WSL_DISTRO_NAME) commands.push(['wslview', []])
    if (env.DISPLAY || env.WAYLAND_DISPLAY) commands.push(['xdg-open', []])
  }
  return commands
}

function summary(presentation: Presentation) {
  const head = `“${presentation.title}” · ${presentation.theme} · ${presentation.font} · ${presentation.scale} · ${presentation.slides.length} slides · ${presentation.duration}s${presentation.loop ? ' · loop' : ''}`
  return [
    head,
    ...presentation.slides.map(
      (s, i) => `${String(i + 1).padStart(2, '0')} ${s.kind.padEnd(12)} ${headingText(s.heading)}`,
    ),
  ].join('\n')
}

async function embed(src: string, imageDir: string) {
  if (!src.startsWith('/')) return fetchAsDataUrl(src)
  const file = path.join(imageDir, src)
  const data = await readFile(file).catch(() => {
    throw new Error(
      `Could not find ${src} at ${file}. Pass --images <dir> pointing at the folder that holds images/.`,
    )
  })
  const ext = path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg')
  return `data:image/${ext};base64,${data.toString('base64')}`
}

async function embedFont(file: string) {
  const data = await readFile(new URL(`../assets/fonts/${file}`, import.meta.url))
  return `data:font/woff2;base64,${data.toString('base64')}`
}

function launch(command: string, args: string[]) {
  return new Promise<boolean>(resolve => {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' })
    const timer = setTimeout(() => {
      child.unref()
      resolve(true)
    }, OPEN_WAIT_MS)
    const finish = (opened: boolean) => {
      clearTimeout(timer)
      resolve(opened)
    }
    child.once('error', () => finish(false))
    child.once('exit', code => finish(code === 0))
  })
}
