import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import {
  fontId,
  fonts,
  formatDeck,
  isScale,
  isTheme,
  parseDeck,
  reviewDeck,
  scales,
  themes,
  tones,
  type Deck,
} from '@/lib/deck'
import { deckHtml, fetchAsDataUrl } from '@/components/slide/deck-html'
import { DEFAULT_TRANSITION, isTransition, transitions } from '@/lib/transitions'

const usage =
  'Usage: render.mjs slides.md [-o slides.html] [--theme room-dark|room-light] [--tone graphite|plum|wine|teal|bronze|#hex] [--font name] [--scale normal|large|kiosk] [--brand text|none] [--images dir] [--transition gentle|fade|slide|none] [--share-safe] [--no-motion] [--check] [--format]'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', short: 'o' },
    theme: { type: 'string' },
    tone: { type: 'string', default: 'graphite' },
    font: { type: 'string' },
    scale: { type: 'string' },
    brand: { type: 'string' },
    images: { type: 'string' },
    transition: { type: 'string', default: DEFAULT_TRANSITION },
    'share-safe': { type: 'boolean', default: false },
    'no-motion': { type: 'boolean', default: false },
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
  const deck = withLook(parseDeck(source))
  if (values.format) await writeFile(input, formatDeck(source))
  if (values.check) {
    console.log(summary(deck))
    reviewDeck(deck).forEach(problem => console.log(`Warning: ${problem}`))
    return
  }
  const theme = values.theme ?? deck.theme
  if (!isTheme(theme)) throw new Error(`Unknown theme “${theme}”. Use ${themes.join(' or ')}.`)
  const tone =
    tones.find(t => t.name.toLowerCase() === values.tone!.toLowerCase())?.color ?? values.tone!
  if (!/^#[0-9a-f]{3,8}$/i.test(tone))
    throw new Error(
      `Unknown tone “${values.tone}”. Use ${tones.map(t => t.name.toLowerCase()).join(', ')} or a #hex color.`,
    )
  const transition = values['no-motion'] ? 'none' : values.transition!
  if (!isTransition(transition))
    throw new Error(`Unknown transition “${transition}”. Use ${transitions.join(', ')}.`)
  const imageDir = values.images ?? path.dirname(path.resolve(input))
  const html = await deckHtml(deck, {
    theme,
    tone,
    transition,
    shareSafe: values['share-safe'],
    embedImage: src => embed(src, imageDir),
    embedFont,
  })
  const out = values.out ?? input.replace(/\.(md|markdown)$/i, '') + '.html'
  await writeFile(out, html)
  console.log(`${summary(deck)}\nWrote ${out}`)
}

function withLook(deck: Deck): Deck {
  const font = values.font ? fontId(values.font) : deck.font
  if (!font)
    throw new Error(`Unknown font “${values.font}”. Use ${fonts.map(f => f.id).join(', ')}.`)
  const scale = values.scale ?? deck.scale
  if (!isScale(scale)) throw new Error(`Unknown scale “${scale}”. Use ${scales.join(', ')}.`)
  const brand =
    values.brand === undefined ? deck.brand : values.brand === 'none' ? '' : values.brand
  return { ...deck, font, scale, brand }
}

function summary(deck: Deck) {
  const head = `“${deck.title}” · ${deck.theme} · ${deck.font} · ${deck.scale} · ${deck.slides.length} slides · ${deck.duration}s${deck.loop ? ' · loop' : ''}`
  return [
    head,
    ...deck.slides.map(
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
