import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseDeck } from '@/lib/deck'

const format = readFileSync(path.join(process.cwd(), 'FORMAT.md'), 'utf8')

/** Every ````markdown example in FORMAT.md is a complete deck or slide the parser must accept. */
const examples = [...format.matchAll(/^````markdown\n([\s\S]*?)^````$/gm)].map(m => m[1])

describe('FORMAT.md', () => {
  it('has examples', () => {
    expect(examples.length).toBeGreaterThan(5)
  })

  it.each(examples.map((source, i) => [i + 1, source]))('example %i parses', (_, source) => {
    expect(() => parseDeck(source)).not.toThrow()
  })

  it('shows every supported slide kind in its examples', () => {
    const kinds = new Set(examples.flatMap(source => parseDeck(source).slides.map(s => s.kind)))
    expect([...kinds].sort()).toEqual(['before-after', 'buttons', 'chart', 'code', 'flow', 'image', 'message', 'metric', 'steps', 'table'])
  })
})
