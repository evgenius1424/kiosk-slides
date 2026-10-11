import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { isTheme, parseDeck, themes, tones, type Deck } from '@/lib/deck'
import { deckHtml, fetchAsDataUrl } from '@/components/slide/deck-html'

const usage = 'Usage: render.mjs deck.md [-o deck.html] [--theme room-dark|room-light] [--tone graphite|plum|wine|teal|bronze|#hex] [--images dir] [--no-motion] [--check]'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', short: 'o' },
    theme: { type: 'string' },
    tone: { type: 'string', default: 'graphite' },
    images: { type: 'string' },
    'no-motion': { type: 'boolean', default: false },
    check: { type: 'boolean', default: false },
  },
})

main().catch(err => { console.error(err.message); process.exit(1) })

async function main() {
  const input = positionals[0]
  if (!input) throw new Error(usage)
  const deck = parseDeck(await readFile(input, 'utf8'))
  if (values.check) { console.log(summary(deck)); return }
  const theme = values.theme ?? deck.theme
  if (!isTheme(theme)) throw new Error(`Unknown theme “${theme}”. Use ${themes.join(' or ')}.`)
  const tone = tones.find(t => t.name.toLowerCase() === values.tone!.toLowerCase())?.color ?? values.tone!
  if (!/^#[0-9a-f]{3,8}$/i.test(tone)) throw new Error(`Unknown tone “${values.tone}”. Use ${tones.map(t => t.name.toLowerCase()).join(', ')} or a #hex color.`)
  const imageDir = values.images ?? path.dirname(path.resolve(input))
  const html = await deckHtml(deck, { theme, tone, motion: !values['no-motion'], embedImage: src => embed(src, imageDir) })
  const out = values.out ?? input.replace(/\.(md|markdown)$/i, '') + '.html'
  await writeFile(out, html)
  console.log(`${summary(deck)}\nWrote ${out}`)
}

function summary(deck: Deck) {
  const head = `“${deck.title}” · ${deck.theme} · ${deck.slides.length} slides · ${deck.duration}s${deck.loop ? ' · loop' : ''}`
  return [head, ...deck.slides.map((s, i) => `${String(i + 1).padStart(2, '0')} ${s.kind.padEnd(12)} ${s.heading.map(p => p.text).join('')}`)].join('\n')
}

async function embed(src: string, imageDir: string) {
  if (!src.startsWith('/')) return fetchAsDataUrl(src)
  const file = path.join(imageDir, src)
  const data = await readFile(file).catch(() => { throw new Error(`Could not find ${src} at ${file}. Pass --images <dir> pointing at the folder that holds images/.`) })
  const ext = path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg')
  return `data:image/${ext};base64,${data.toString('base64')}`
}
