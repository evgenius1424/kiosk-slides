import { describe, expect, it } from 'vitest'
import { editFor, editorKey, type EditorKey } from './editor-keys'

describe('editorKey', () => {
  const key = (key: string, extra: Partial<KeyboardEvent> = {}) =>
    editorKey({
      key,
      code: `Key${key.toUpperCase()}`,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      isComposing: false,
      ...extra,
    })

  it('reads the editor shortcuts', () => {
    expect(key('Enter')).toBe('newLine')
    expect(key('Enter', { shiftKey: true })).toBeUndefined()
    expect(key('Tab')).toBe('indent')
    expect(key('Tab', { shiftKey: true })).toBe('outdent')
    expect(key('b', { metaKey: true })).toBe('bold')
    expect(key('i', { ctrlKey: true })).toBe('italic')
    expect(key('ArrowUp', { altKey: true })).toBe('lineUp')
    expect(key('ArrowDown', { altKey: true })).toBe('lineDown')
    expect(key('D', { metaKey: true, shiftKey: true })).toBe('duplicateLine')
    expect(key('d', { metaKey: true })).toBeUndefined()
    expect(key('s', { ctrlKey: true })).toBe('tidy')
    expect(key('Ï', { altKey: true, shiftKey: true, code: 'KeyF' })).toBe('tidy')
    expect(key('¬', { metaKey: true, altKey: true, code: 'KeyL' })).toBe('tidy')
    expect(key('Enter', { isComposing: true })).toBeUndefined()
  })
})

describe('editFor', () => {
  const run = (key: Exclude<EditorKey, 'tidy'>, marked: string) => {
    const start = marked.indexOf('«')
    const end = marked.indexOf('»') - 1
    const value = marked.replace('«', '').replace('»', '')
    const edit = editFor(key, { value, start, end })
    if (!edit) return null
    const next = value.slice(0, edit.from) + edit.text + value.slice(edit.to)
    return `${next.slice(0, edit.start)}«${next.slice(edit.start, edit.end)}»${next.slice(edit.end)}`
  }

  it('continues lists and quotes on Enter', () => {
    expect(run('newLine', '- First«»')).toBe('- First\n- «»')
    expect(run('newLine', '  * Deep«»')).toBe('  * Deep\n  * «»')
    expect(run('newLine', '9. Ninth«»')).toBe('9. Ninth\n10. «»')
    expect(run('newLine', '- [x] Done«»')).toBe('- [x] Done\n- [ ] «»')
    expect(run('newLine', '> Said«»')).toBe('> Said\n> «»')
    expect(run('newLine', '- Fir«»st')).toBe('- Fir\n- «»st')
  })

  it('ends a list on Enter in an empty item', () => {
    expect(run('newLine', '- One\n- «»')).toBe('- One\n«»')
    expect(run('newLine', '- One\n- [ ] «»')).toBe('- One\n«»')
  })

  it('leaves Enter alone outside lists', () => {
    expect(run('newLine', '# Title«»')).toBeNull()
    expect(run('newLine', '«-» One')).toBeNull()
    expect(run('newLine', '«- One»')).toBeNull()
  })

  it('wraps and unwraps bold and italic', () => {
    expect(run('bold', 'A «word» here')).toBe('A **«word»** here')
    expect(run('bold', 'A **«word»** here')).toBe('A «word» here')
    expect(run('bold', 'A «**word**» here')).toBe('A «word» here')
    expect(run('bold', 'A «»')).toBe('A **«»**')
    expect(run('italic', 'A «word»')).toBe('A *«word»*')
    expect(run('italic', 'A *«word»*')).toBe('A «word»')
    expect(run('italic', 'A **«word»**')).toBe('A ***«word»***')
  })

  it('indents and outdents lines', () => {
    expect(run('indent', 'Some«» text')).toBe('Some  «» text')
    expect(run('indent', '- One\n- Tw«»o')).toBe('- One\n  - Tw«»o')
    expect(run('indent', '- «One\n\n- Tw»o')).toBe('  - «One\n\n  - Tw»o')
    expect(run('outdent', '  - «One\n  - Tw»o')).toBe('- «One\n- Tw»o')
    expect(run('outdent', ' - O«»ne')).toBe('- O«»ne')
    expect(run('outdent', '- O«»ne')).toBeNull()
  })

  it('moves lines up and down', () => {
    expect(run('lineUp', 'One\nTw«»o\nThree')).toBe('Tw«»o\nOne\nThree')
    expect(run('lineDown', 'One\nTw«»o\nThree')).toBe('One\nThree\nTw«»o')
    expect(run('lineDown', '«One\nTwo\n»Three')).toBe('Three\n«One\nTwo»')
    expect(run('lineUp', '\nTw«»o')).toBe('Tw«»o\n')
    expect(run('lineUp', 'O«»ne\nTwo')).toBeNull()
    expect(run('lineDown', 'One\nTw«»o')).toBeNull()
  })

  it('duplicates lines below and selects the copy', () => {
    expect(run('duplicateLine', 'One\nTw«»o')).toBe('One\nTwo\nTw«»o')
    expect(run('duplicateLine', '«One\nTw»o\nEnd')).toBe('One\nTwo\n«One\nTw»o\nEnd')
  })
})
