import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseDeck, reviewDeck } from '@/lib/deck'

const example = readFileSync(path.join(process.cwd(), 'public/example.md'), 'utf8')

describe('reviewDeck', () => {
  it('finds nothing to fix in the example presentation', () => {
    expect(reviewDeck(parseDeck(example))).toEqual([])
  })

  it('flags a presentation of bare headings', () => {
    const source = ['# One', '# Two', '# Three', '# Four', '# Five'].join('\n\n---\n\n')
    expect(reviewDeck(parseDeck(source))).toEqual([
      'Give the presentation a short title: in its front matter.',
      'Give every slide a settings comment with a title, a label and a footer (title, label, footer missing on slides 1, 2, 3, 4, 5).',
      'Slides 1, 2, 3, 4, 5 are only a heading and text. Turn some into steps, before/after, a metric, a chart, a table or a flow, so at most 2 slides have no widget.',
    ])
  })

  it('names only the slides missing a setting', () => {
    const source = [
      '---\ntitle: Demo\n---',
      '<!--\ntitle: A\nlabel: B\nfooter: C\n-->\n\n# One',
      '<!--\ntitle: A\nlabel: B\n-->\n\n# Two',
    ].join('\n\n---\n\n')
    expect(reviewDeck(parseDeck(source))).toEqual([
      'Give every slide a settings comment with a title, a label and a footer (footer missing on slide 2).',
    ])
  })
})
