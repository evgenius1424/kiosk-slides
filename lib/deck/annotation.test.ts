import { describe, expect, it } from 'vitest'
import { parseAnnotation } from '@/lib/deck/annotation'

const fail = (message: string): never => { throw new Error(message) }

describe('parseAnnotation', () => {
  it('reads a bare type', () => {
    expect(parseAnnotation('<!-- metric -->', fail)).toEqual({ type: 'metric', args: {} })
  })

  it('reads key=value settings', () => {
    expect(parseAnnotation('<!--chart: type=bar  x=Month y=Sales-->', fail)).toEqual({ type: 'chart', args: { type: 'bar', x: 'Month', y: 'Sales' } })
  })

  it('rejects settings that are not key=value', () => {
    expect(() => parseAnnotation('<!-- chart: type bar -->', fail)).toThrow('Write annotation settings as key=value pairs, e.g. <!-- chart: type=bar -->.')
  })

  it('rejects a comment that is not one type word', () => {
    expect(() => parseAnnotation('<!-- some notes here -->', fail)).toThrow('Write an annotation as <!-- type --> or <!-- type: key=value -->.')
  })
})
