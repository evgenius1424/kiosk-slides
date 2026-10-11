import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatDeck, parseDeck } from '@/lib/deck'

const md = (...lines: string[]) => lines.join('\n')
const example = readFileSync(path.join(process.cwd(), 'public/example.md'), 'utf8')

describe('formatDeck', () => {
  it('aligns tables and keeps annotations directly above them', () => {
    const source = md(
      '# Results',
      'Recall drops fast.',
      '<!-- chart: type=bar x=Slides y=Recall -->',
      '|Slides|Recall|',
      '|---|--:|',
      '|5|82|',
      '|10|64|',
    )
    expect(formatDeck(source)).toBe(
      md(
        '# Results',
        '',
        'Recall drops fast.',
        '<!-- chart: type=bar x=Slides y=Recall -->',
        '| Slides | Recall |',
        '| ------ | -----: |',
        '| 5      | 82     |',
        '| 10     | 64     |',
        '',
      ),
    )
  })

  it('normalizes slide separators, blank lines and bullet markers', () => {
    const source = md(
      '---',
      'title: Demo',
      '---',
      '<!--',
      'title: One',
      '-->',
      '# First   ',
      '',
      '',
      '',
      'Body',
      '---',
      '# Second',
      '<!-- flow -->',
      '* Notes -> Slides',
      '',
      '---',
      '',
    )
    expect(formatDeck(source)).toBe(
      md(
        '---',
        'title: Demo',
        '---',
        '',
        '<!--',
        'title: One',
        '-->',
        '# First',
        '',
        'Body',
        '',
        '---',
        '',
        '# Second',
        '',
        '<!-- flow -->',
        '- Notes -> Slides',
        '',
      ),
    )
  })

  it('leaves code untouched', () => {
    const source = md('# Code', '', '```txt', '|a|b|', '|---|---|', '*  x   ', '```', '')
    expect(formatDeck(source)).toBe(source)
  })

  it('returns a presentation the parser rejects unchanged', () => {
    const source = md('# One', '## Two', '|a|b|', '|-|-|', '|1|2|')
    expect(formatDeck(source)).toBe(source)
  })

  it('never changes what the example presentation shows', () => {
    const formatted = formatDeck(example)
    expect(parseDeck(formatted)).toEqual(parseDeck(example))
    expect(formatDeck(formatted)).toBe(formatted)
  })
})
