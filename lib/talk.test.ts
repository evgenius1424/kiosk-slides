import { describe, expect, it } from 'vitest'
import { GOALS, requestPrompt, talkRequest } from '@/lib/talk'

describe('talk request', () => {
  it('asks for the topic alone', () => {
    const request = talkRequest({ topic: '  Why we moved to Postgres ' })
    expect(request).toMatch(/^My talk: Why we moved to Postgres\n/)
    expect(request).not.toContain('Goal')
    expect(request).not.toContain('Length')
  })

  it('adds the goal and length when picked', () => {
    const request = talkRequest({ topic: 'Q3 results', goal: 'inform', length: 'long' })
    expect(request).toContain('Goal: inform them.')
    expect(request).toContain('Length: about 12 slides.')
  })

  it('gives every goal its own voice', () => {
    const goals = GOALS.map(goal => talkRequest({ topic: 'x', goal }))
    expect(new Set(goals).size).toBe(GOALS.length)
    for (const request of goals) expect(request).toMatch(/Goal: .+ Sound .+\./)
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
})
