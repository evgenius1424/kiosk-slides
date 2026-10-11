import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parsePresentation, reviewPresentation } from '@/lib/presentation'

const example = readFileSync(path.join(process.cwd(), 'public/example.md'), 'utf8')

describe('reviewPresentation', () => {
  it('finds nothing to fix in the example presentation', () => {
    expect(reviewPresentation(parsePresentation(example))).toEqual([])
  })

  it('flags a presentation of bare headings', () => {
    const source = ['# One', '# Two', '# Three', '# Four', '# Five'].join('\n\n---\n\n')
    expect(reviewPresentation(parsePresentation(source))).toEqual([
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
    expect(reviewPresentation(parsePresentation(source))).toEqual([
      'Give every slide a settings comment with a title, a label and a footer (footer missing on slide 2).',
    ])
  })

  it('asks for alt text on images without it', () => {
    const source = [
      '---\ntitle: Demo\n---',
      '<!--\ntitle: A\nlabel: B\nfooter: C\n-->\n\n# One\n\n![](https://example.com/a.png)',
      '<!--\ntitle: A\nlabel: B\nfooter: C\n-->\n\n# Two\n\n![A chart of sales](https://example.com/b.png)',
    ].join('\n\n---\n\n')
    expect(reviewPresentation(parsePresentation(source))).toEqual([
      'Slide 1: describe the image in its alt text.',
    ])
  })
})
