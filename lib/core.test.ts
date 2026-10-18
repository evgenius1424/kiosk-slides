import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const CORE = ['lib/presentation', 'lib/player.ts', 'lib/slide-styles.ts', 'components/slide']
const CORE_ALIASES = [
  '@/lib/presentation',
  '@/lib/player',
  '@/lib/slide-styles',
  '@/components/slide',
]
const PACKAGES = [
  'react',
  'react-dom/server',
  'remark',
  'remark-gfm',
  'mdast',
  'mdast-util-to-string',
]

describe('rendering core', () => {
  it('imports only itself, React and the Markdown parser', () => {
    const outside = coreFiles().flatMap(file =>
      imports(file)
        .filter(
          spec =>
            !spec.startsWith('.') &&
            !CORE_ALIASES.some(alias => spec === alias || spec.startsWith(`${alias}/`)) &&
            !PACKAGES.includes(spec),
        )
        .map(spec => `${file}: ${spec}`),
    )
    expect(outside).toEqual([])
  })

  it('keeps the parser free of the player and the renderer', () => {
    const upward = walk('lib/presentation')
      .filter(file => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
      .flatMap(file =>
        imports(file)
          .filter(spec => /(^|\/)(player|slide-styles|components\/slide)(\/|$)/.test(spec))
          .map(spec => `${file}: ${spec}`),
      )
    expect(upward).toEqual([])
  })

  it('stays free of framework directives', () => {
    const marked = coreFiles().filter(file => /^\s*['"]use (client|server)['"]/m.test(read(file)))
    expect(marked).toEqual([])
  })
})

function coreFiles(): string[] {
  return CORE.flatMap(walk).filter(file => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
}

function walk(entry: string): string[] {
  if (!statSync(entry).isDirectory()) return [entry]
  return readdirSync(entry).flatMap(name => walk(path.join(entry, name)))
}

function imports(file: string) {
  return [...read(file).matchAll(/(?:from|import)\s*\(?\s*'([^']+)'/g)].map(m => m[1])
}

function read(file: string) {
  return readFileSync(file, 'utf8')
}
