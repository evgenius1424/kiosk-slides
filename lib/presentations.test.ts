import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parsePresentation } from '@/lib/presentation'
import {
  blankPresentation,
  createPresentation,
  presentationName,
  uniqueName,
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
})
