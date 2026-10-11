import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parsePresentation } from '@/lib/presentation'

const example = readFileSync(path.join(process.cwd(), 'public/example.md'), 'utf8')

describe('public/example.md', () => {
  it('parses and shows every supported slide kind', () => {
    const kinds = new Set(parsePresentation(example).slides.map(s => s.kind))
    // Each component ticket adds its kind here along with a slide in the example.
    expect([...kinds].sort()).toEqual([
      'before-after',
      'buttons',
      'chart',
      'code',
      'flow',
      'image',
      'message',
      'metric',
      'steps',
      'table',
    ])
  })
})
