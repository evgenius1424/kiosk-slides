import { describe, expect, it } from 'vitest'
import {
  KEPT_VERSIONS,
  STORED_VERSIONS,
  addVersion,
  forgetVersions,
  storedHistory,
  takeVersion,
  type History,
} from '@/lib/history'

describe('undo history', () => {
  it('gives back the exact previous source, newest first', () => {
    let history: History = {}
    history = addVersion(history, 'a', '# One\n')
    history = addVersion(history, 'a', '# Two\n')
    const first = takeVersion(history, 'a')!
    expect(first.source).toBe('# Two\n')
    expect(takeVersion(first.history, 'a')!.source).toBe('# One\n')
    expect(takeVersion(takeVersion(first.history, 'a')!.history, 'a')).toBeNull()
  })

  it('keeps the last 20 versions of each presentation and skips repeats', () => {
    let history: History = {}
    for (let i = 0; i < 30; i++) history = addVersion(history, 'a', `# ${i}\n`)
    history = addVersion(history, 'a', '# 29\n')
    expect(history.a).toHaveLength(KEPT_VERSIONS)
    expect(history.a[0]).toBe('# 10\n')
    expect(history.a.at(-1)).toBe('# 29\n')
  })

  it('stores only the last 5 of each, newest first while the size cap allows', () => {
    const history: History = {
      a: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'],
      b: ['bbbbbbbbb1', 'bbbbbbbbb2'],
    }
    expect(storedHistory(history).a).toEqual(['a3', 'a4', 'a5', 'a6', 'a7'])
    expect(storedHistory(history).a).toHaveLength(STORED_VERSIONS)
    expect(storedHistory(history, 14)).toEqual({ a: ['a6', 'a7'], b: ['bbbbbbbbb2'] })
  })

  it('forgets a deleted presentation', () => {
    expect(forgetVersions({ a: ['x'], b: ['y'] }, 'a')).toEqual({ b: ['y'] })
  })
})
