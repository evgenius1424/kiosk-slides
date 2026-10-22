import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { formatPresentation, parsePresentation } from '@/lib/presentation'
import {
  blankPresentation,
  createPresentation,
  mergeLibrary,
  pastedPresentation,
  presentationName,
  uniqueName,
  type Library,
  type SavedPresentation,
} from '@/lib/presentations'
import messages from '@/messages/en.json'

const DEFAULT_NAME = messages.Presentations.untitled
const BLANK_PRESENTATION = blankPresentation(
  messages.Presentations.blank.heading,
  messages.Presentations.blank.body,
)

describe('presentations', () => {
  it('starts new presentations from a valid one-slide presentation', () => {
    expect(parsePresentation(BLANK_PRESENTATION).slides).toHaveLength(1)
  })

  it('numbers names that are already taken', () => {
    const first = createPresentation(DEFAULT_NAME, BLANK_PRESENTATION, [])
    const second = createPresentation(DEFAULT_NAME, BLANK_PRESENTATION, [first])
    expect(second.name).toBe(`${DEFAULT_NAME} 2`)
    expect(createPresentation(DEFAULT_NAME, BLANK_PRESENTATION, [first, second]).name).toBe(
      `${DEFAULT_NAME} 3`,
    )
    expect(uniqueName(DEFAULT_NAME, [first], first.id)).toBe(DEFAULT_NAME)
  })

  it('names a presentation from its title, or its first heading', () => {
    expect(presentationName(readFileSync('public/example.md', 'utf8'))).toBe(
      'Kiosk Slides — example presentation',
    )
    expect(presentationName('# Ship **faster** with less\n')).toBe('Ship faster with less')
    expect(presentationName('## not a presentation')).toBe('')
  })

  it('takes pasted text that looks like a presentation', () => {
    const messy = '# One\n\n|a|b|\n|-|-|\n|1|22|'
    expect(pastedPresentation(messy)).toBe(formatPresentation(`${messy}\n`))
    expect(pastedPresentation(messy)).not.toBe(`${messy}\n`)
    expect(pastedPresentation('---\ntitle: Plan\n---\n\nJust text')).toContain('title: Plan')
    expect(pastedPresentation('# One\n\n## Two\n# Three')).toBe('# One\n\n## Two\n# Three\n')
  })

  it('ignores pasted text that is not a presentation', () => {
    expect(pastedPresentation('hello there')).toBeNull()
    expect(pastedPresentation('https://example.com/#top')).toBeNull()
    expect(pastedPresentation('## Only a subheading')).toBeNull()
    expect(pastedPresentation('#hashtag')).toBeNull()
  })

  it('strips one code fence around a pasted presentation', () => {
    expect(pastedPresentation('```markdown\n# One\n\n```js\nx\n```\n```\n')).toBe(
      '# One\n\n```js\nx\n```\n',
    )
    expect(pastedPresentation('~~~md\r\n# One\r\n~~~')).toBe('# One\n')
  })

  it('merges a save with what another tab saved meanwhile', () => {
    const a = saved('a', 'A')
    const b = saved('b', 'B')
    const base = library('a', a, b)
    const theirs = library('a', a, saved('b', 'B edited'), saved('c', 'C'))
    const ours = library('a', saved('a', 'A edited'), b)
    expect(mergeLibrary(base, ours, theirs).items.map(p => p.source)).toEqual([
      'A edited',
      'B edited',
      'C',
    ])
  })

  it('keeps deletions from either tab and moves off a deleted current one', () => {
    const a = saved('a', 'A', 1)
    const b = saved('b', 'B', 2)
    const c = saved('c', 'C', 3)
    const base = library('a', a, b, c)
    const merged = mergeLibrary(base, library('a', a, b), library('a', b, c))
    expect(merged).toEqual(library('b', b))
  })

  it('returns the same library when nothing changed elsewhere', () => {
    const ours = library('a', saved('a', 'A'))
    expect(mergeLibrary(ours, ours, JSON.parse(JSON.stringify(ours)))).toBe(ours)
    expect(mergeLibrary(ours, ours, null)).toBe(ours)
  })
})

function saved(id: string, source: string, updatedAt = 0): SavedPresentation {
  return { id, name: id, source, userNamed: false, updatedAt }
}

function library(current: string, ...items: SavedPresentation[]): Library {
  return { current, items }
}
