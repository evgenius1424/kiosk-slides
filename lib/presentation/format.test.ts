import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatPresentation, formattedPosition, parsePresentation } from '@/lib/presentation'

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

describe('formattedPosition', () => {
  const before = md(
    '# Plan  ',
    '',
    '',
    '',
    '* First point',
    '* Next',
    '---',
    '# Owners',
    '|Name|Owner|',
    '|-|-|',
    '|Ana|Me|',
  )
  const after = formatPresentation(before)
  const moved = (at: number) => {
    const next = formattedPosition(before, after, at)
    return `${after.slice(0, next)}^${after.slice(next)}`
  }

  it('keeps the same letter after the cursor everywhere', () => {
    const letters = [...before.matchAll(/[^\s|*+-]/g)]
    expect(letters.map(m => after[formattedPosition(before, after, m.index)])).toEqual(
      letters.map(m => m[0]),
    )
  })

  it('keeps the cursor next to the same word when lines move', () => {
    expect(after).not.toBe(before)
    expect(moved(before.indexOf('point'))).toContain('- First ^point')
    expect(moved(before.indexOf('Owner|') + 2)).toContain('| Ow^ner |')
    expect(moved(before.indexOf('Ana') + 3)).toContain('| Ana^  |')
  })

  it('keeps the cursor at the start of a line or after a bullet', () => {
    expect(moved(before.indexOf('* First'))).toContain('\n^- First')
    expect(moved(before.indexOf('First'))).toContain('\n- ^First')
    expect(moved(before.indexOf('|Ana'))).toContain('\n^| Ana')
    expect(moved(before.indexOf('# Owners'))).toContain('---\n\n^# Owners')
  })

  it('keeps the cursor on a blank line and drops trailing spaces', () => {
    expect(moved(before.indexOf('* First') - 1)).toContain('# Plan\n^\n- First')
    expect(moved(before.indexOf('\n'))).toContain('# Plan^\n')
    expect(formattedPosition(before, after, before.length)).toBe(after.length - 1)
    expect(formattedPosition(before, after, 0)).toBe(0)
  })
})
