import { describe, expect, it } from 'vitest'
import { requestPrompt, talkRequest } from '@/lib/talk'
import messages from '@/messages/en.json'

describe('talk request', () => {
  it('asks for the topic alone', () => {
    const request = talkRequest({ topic: '  Why we moved to Postgres ' })
    expect(request).toMatch(/^My talk: Why we moved to Postgres\n/)
    expect(request).not.toContain('Audience')
    expect(request).not.toContain('Length')
  })

  it('adds the audience and length when picked', () => {
    const request = talkRequest({ topic: 'Q3 results', audience: 'leadership', length: 'long' })
    expect(request).toContain('Audience: leadership.')
    expect(request).toContain('Length: about 12 slides.')
  })

  it('ends the copy prompt with the request, or asks for one', () => {
    expect(requestPrompt('GUIDE', { topic: 'Q3 results', length: 'short' })).toBe(
      `GUIDE\n\nHere is my request:\n${talkRequest({ topic: 'Q3 results', length: 'short' })}`,
    )
    expect(requestPrompt('GUIDE', { topic: ' ' })).toBe(
      'GUIDE\n\nWhat should the presentation be about?',
    )
    expect(requestPrompt('GUIDE')).toBe('GUIDE\n\nWhat should the presentation be about?')
  })

  it('has a sentence with a gap to fill for every starter', () => {
    for (const starter of Object.values(messages.Start.starters))
      expect(starter.text).toContain('…')
  })
})
