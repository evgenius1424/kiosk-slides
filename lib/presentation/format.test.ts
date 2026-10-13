import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatPresentation, parsePresentation } from '@/lib/presentation'

const md = (...lines: string[]) => lines.join('\n')
const example = readFileSync(path.join(process.cwd(), 'public/example.md'), 'utf8')

describe('formatPresentation', () => {
  it('aligns tables and keeps annotations directly above them', () => {
    const source = md(
      '# Results',
      '',
      'Recall drops fast.',
      '<!-- chart: type=bar x=Slides y=Recall -->',
      '|Slides|Recall|',
      '|---|--:|',
      '|5|82|',
      '|10|64|',
    )
    expect(formatPresentation(source)).toBe(
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
    expect(formatPresentation(source)).toBe(
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

  it('keeps a heading line break and the body lines as written', () => {
    const source = md('# Ship it', '**today**', '', 'First line', 'second line', '')
    expect(formatPresentation(source)).toBe(source)
  })

  it('leaves code untouched', () => {
    const source = md('# Code', '', '```txt', '|a|b|', '|---|---|', '*  x   ', '```', '')
    expect(formatPresentation(source)).toBe(source)
  })

  it('returns a presentation the parser rejects unchanged', () => {
    const source = md('# One', '## Two', '|a|b|', '|-|-|', '|1|2|')
    expect(formatPresentation(source)).toBe(source)
  })

  it('never changes what the example presentation shows', () => {
    const formatted = formatPresentation(example)
    expect(parsePresentation(formatted)).toEqual(parsePresentation(example))
    expect(formatPresentation(formatted)).toBe(formatted)
  })
})
