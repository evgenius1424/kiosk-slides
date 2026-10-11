import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseDeck } from '@/lib/deck'
import { blankDeck, createPresentation, deckName, uniqueName } from '@/lib/presentations'
import messages from '@/messages/en.json'

const DEFAULT_NAME = messages.Presentations.untitled
const BLANK_DECK = blankDeck(
  messages.Presentations.blank.heading,
  messages.Presentations.blank.body,
)

describe('presentations', () => {
  it('starts new presentations from a valid one-slide deck', () => {
    expect(parseDeck(BLANK_DECK).slides).toHaveLength(1)
  })

  it('numbers names that are already taken', () => {
    const first = createPresentation(DEFAULT_NAME, BLANK_DECK, [])
    const second = createPresentation(DEFAULT_NAME, BLANK_DECK, [first])
    expect(second.name).toBe(`${DEFAULT_NAME} 2`)
    expect(createPresentation(DEFAULT_NAME, BLANK_DECK, [first, second]).name).toBe(
      `${DEFAULT_NAME} 3`,
    )
    expect(uniqueName(DEFAULT_NAME, [first], first.id)).toBe(DEFAULT_NAME)
  })

  it('names a deck from its title, or its first heading', () => {
    expect(deckName(readFileSync('public/example.md', 'utf8'))).toBe('Kiosk Slides — example deck')
    expect(deckName('# Ship **faster** with less\n')).toBe('Ship faster with less')
    expect(deckName('## not a deck')).toBe('')
  })
})
