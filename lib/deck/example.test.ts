import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseDeck } from '@/lib/deck'

const example = readFileSync(path.join(process.cwd(), 'public/example.md'), 'utf8')

describe('public/example.md', () => {
  it('parses and shows every supported slide kind', () => {
    const kinds = new Set(parseDeck(example).slides.map(s => s.kind))
    // Each component ticket adds its kind here along with a slide in the example.
    expect([...kinds].sort()).toEqual(['code', 'flow', 'image', 'message', 'steps'])
  })
})
