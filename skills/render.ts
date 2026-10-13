import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import {
  fontId,
  fonts,
  formatPresentation,
  isScale,
  isTheme,
  parsePresentation,
  reviewPresentation,
  scales,
  setPresentationTheme,
  themes,
  toneColor,
  toneHint,
  type Presentation,
} from '@/lib/presentation'
import { presentationHtml, fetchAsDataUrl } from '@/components/slide/presentation-html'
import { isTransition, transitions } from '@/lib/player'
import { shareLink } from '@/lib/share'
import { SITE_URL } from '@/lib/site'

const usage =
  'Usage: render.mjs slides.md [-o slides.html] [--theme room-dark|room-light|studio] [--tone mono|violet|coral|teal|amber|#hex] [--font name] [--scale normal|large|hero] [--brand text|none] [--images dir] [--transition gentle|fade|slide|none] [--share-safe] [--no-motion] [--no-credit] [--no-link] [--check] [--format]'

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
  const link = values['no-link'] ? undefined : await openLink(source)
  if (link) console.log(`Open in your browser: ${link}`)
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

async function openLink(source: string) {
  const link = await shareLink(source, SITE_URL).catch(() => undefined)
  return link && 'url' in link ? link.url : undefined
}

function summary(presentation: Presentation) {
  const head = `“${presentation.title}” · ${presentation.theme} · ${presentation.font} · ${presentation.scale} · ${presentation.slides.length} slides · ${presentation.duration}s${presentation.loop ? ' · loop' : ''}`
  return [
    head,
    ...presentation.slides.map(
      (s, i) =>
        `${String(i + 1).padStart(2, '0')} ${s.kind.padEnd(12)} ${s.heading.map(p => p.text).join('')}`,
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
