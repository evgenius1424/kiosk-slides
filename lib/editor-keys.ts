export type EditorKey =
  | 'newLine'
  | 'bold'
  | 'italic'
  | 'indent'
  | 'outdent'
  | 'lineUp'
  | 'lineDown'
  | 'duplicateLine'
  | 'tidy'

export type TextState = { value: string; start: number; end: number }

export type TextEdit = { from: number; to: number; text: string; start: number; end: number }

type Key = Pick<
  KeyboardEvent,
  'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'isComposing'
>

const INDENT = '  '

export function editorKey(event: Key): EditorKey | undefined {
  if (event.isComposing) return
  const command = event.metaKey || event.ctrlKey
  const { altKey: alt, shiftKey: shift } = event
  const key = event.key.toLowerCase()
  if (!command && !alt) {
    if (event.key === 'Enter' && !shift) return 'newLine'
    if (event.key === 'Tab') return shift ? 'outdent' : 'indent'
    return
  }
  if (alt && !command && !shift) {
    if (event.key === 'ArrowUp') return 'lineUp'
    if (event.key === 'ArrowDown') return 'lineDown'
  }
  if (alt && shift && !command && event.code === 'KeyF') return 'tidy'
  if (command && alt && !shift && event.code === 'KeyL') return 'tidy'
  if (!command || alt) return
  if (shift) return key === 'd' ? 'duplicateLine' : undefined
  if (key === 's') return 'tidy'
  if (key === 'b') return 'bold'
  if (key === 'i') return 'italic'
}

export function editFor(key: Exclude<EditorKey, 'tidy'>, state: TextState): TextEdit | null {
  switch (key) {
    case 'newLine':
      return newLine(state)
    case 'bold':
      return wrap(state, '**')
    case 'italic':
      return wrap(state, '*')
    case 'indent':
      return indent(state)
    case 'outdent':
      return changeLines(state, line => line.replace(/^( {1,2}|\t)/, ''))
    case 'lineUp':
      return moveLines(state, -1)
    case 'lineDown':
      return moveLines(state, 1)
    case 'duplicateLine':
      return duplicateLines(state)
  }
}

const listItem = /^(\s*)(?:([-*+])|(\d+)([.)]))(\s+)(\[[ xX]\]\s+)?/
const quoteLine = /^(\s*>\s?)/

function newLine({ value, start, end }: TextState): TextEdit | null {
  if (start !== end) return null
  const { from, to } = lines(value, start, end)
  const line = value.slice(from, to)
  const prefix = line.match(listItem) ?? line.match(quoteLine)
  if (!prefix || start < from + prefix[0].length) return null
  if (!line.slice(prefix[0].length).trim()) return { from, to, text: '', start: from, end: from }
  const text = `\n${nextPrefix(prefix)}`
  return { from: start, to: start, text, start: start + text.length, end: start + text.length }
}

function nextPrefix(match: RegExpMatchArray) {
  const [whole, indent, bullet, number, delimiter, space, box] = match
  if (indent === undefined || space === undefined) return whole
  const marker = bullet ?? `${Number(number) + 1}${delimiter}`
  return `${indent}${marker}${space}${box ? '[ ] ' : ''}`
}

function wrap({ value, start, end }: TextState, mark: string): TextEdit {
  const selected = value.slice(start, end)
  const size = mark.length
  if (
    value.slice(start - size, start) === mark &&
    value.slice(end, end + size) === mark &&
    (size === 2 || value[start - 2] !== '*' || value.slice(start - 3, start) === '***')
  )
    return {
      from: start - size,
      to: end + size,
      text: selected,
      start: start - size,
      end: end - size,
    }
  if (selected.length >= size * 2 && selected.startsWith(mark) && selected.endsWith(mark)) {
    const text = selected.slice(size, -size)
    return { from: start, to: end, text, start, end: start + text.length }
  }
  return {
    from: start,
    to: end,
    text: mark + selected + mark,
    start: start + size,
    end: end + size,
  }
}

function indent(state: TextState): TextEdit | null {
  const { value, start, end } = state
  const { from, to } = lines(value, start, end)
  if (start === end && !listItem.test(value.slice(from, to)))
    return { from: start, to: start, text: INDENT, start: start + 2, end: start + 2 }
  return changeLines(state, line => (line ? INDENT + line : line))
}

function changeLines({ value, start, end }: TextState, change: (line: string) => string) {
  const { from, to } = lines(value, start, end)
  const before = value.slice(from, to).split('\n')
  const after = before.map(change)
  const text = after.join('\n')
  if (text === value.slice(from, to)) return null
  const first = after[0].length - before[0].length
  const total = text.length - (to - from)
  return {
    from,
    to,
    text,
    start: Math.max(from, start + first),
    end: Math.max(from, end + total),
  }
}

function moveLines({ value, start, end }: TextState, step: -1 | 1): TextEdit | null {
  const { from, to } = lines(value, start, end)
  const block = value.slice(from, to)
  if (step < 0) {
    if (!from) return null
    const above = lineStart(value, from - 1)
    const line = value.slice(above, from - 1)
    const shift = line.length + 1
    return { from: above, to, text: `${block}\n${line}`, start: start - shift, end: end - shift }
  }
  if (to >= value.length) return null
  const below = lineEnd(value, to + 1)
  const line = value.slice(to + 1, below)
  const shift = line.length + 1
  const text = `${line}\n${block}`
  return {
    from,
    to: below,
    text,
    start: start + shift,
    end: Math.min(end + shift, from + text.length),
  }
}

function duplicateLines({ value, start, end }: TextState): TextEdit {
  const { from, to } = lines(value, start, end)
  const text = `\n${value.slice(from, to)}`
  return { from: to, to, text, start: start + text.length, end: end + text.length }
}

function lines(value: string, start: number, end: number) {
  const from = lineStart(value, start)
  const last = end > start && value[end - 1] === '\n' ? end - 1 : end
  return { from, to: lineEnd(value, Math.max(from, last)) }
}

function lineStart(value: string, at: number) {
  return at > 0 ? value.lastIndexOf('\n', at - 1) + 1 : 0
}

function lineEnd(value: string, at: number) {
  const end = value.indexOf('\n', at)
  return end < 0 ? value.length : end
}
