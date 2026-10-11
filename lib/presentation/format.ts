import { parsePresentation } from './parse'

export function formatPresentation(source: string) {
  const original = source.replace(/\r\n?/g, '\n')
  let before: string
  try {
    before = JSON.stringify(parsePresentation(original))
  } catch {
    return source
  }
  const formatted = format(original)
  try {
    return JSON.stringify(parsePresentation(formatted)) === before ? formatted : source
  } catch {
    return source
  }
}

const fenceStart = /^\s{0,3}(```|~~~)/
const delimiterRow = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/
const thematicBreak = /^\s*([*_-])(\s*\1){2,}\s*$/

function format(source: string) {
  const lines = source.split('\n').map(l => l.replace(/\s+$/, ''))
  let start = 0
  const front: string[] = []
  if (lines[0] === '---') {
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
    front.push(...lines.slice(0, end + 1))
    start = end + 1
  }
  const slides = splitSlides(lines.slice(start))
    .map(formatSlide)
    .filter(s => s.length)
    .map(s => s.join('\n'))
  return (
    [...(front.length ? [front.join('\n')] : []), slides.join('\n\n---\n\n')].join('\n\n') + '\n'
  )
}

function splitSlides(lines: string[]) {
  const slides: string[][] = [[]]
  let fence = false
  for (const line of lines) {
    if (line.startsWith('```')) fence = !fence
    if (!fence && line.trim() === '---') slides.push([])
    else slides[slides.length - 1].push(line)
  }
  return slides
}

function formatSlide(lines: string[]) {
  const out: string[] = []
  const blank = () => {
    if (out.length && out[out.length - 1] !== '') out.push('')
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const fence = line.match(fenceStart)
    if (fence) {
      const end = lines.findIndex((l, j) => j > i && l.trimStart().startsWith(fence[1]))
      const stop = end < 0 ? lines.length - 1 : end
      out.push(...lines.slice(i, stop + 1))
      i = stop
    } else if (line.trimStart().startsWith('<!--')) {
      const end = lines.findIndex((l, j) => j >= i && l.includes('-->'))
      const stop = end < 0 ? lines.length - 1 : end
      out.push(...lines.slice(i, stop + 1))
      i = stop
    } else if (!line.trim()) blank()
    else if (/^\s{0,3}#{1,6}(\s|$)/.test(line)) {
      if (out.length && !out[out.length - 1].includes('-->')) blank()
      out.push(line.trim())
      if (lines[i + 1]?.trim()) out.push('')
    } else if (line.includes('|') && delimiterRow.test(lines[i + 1] ?? '')) {
      let end = i + 2
      while (end < lines.length && lines[end].includes('|')) end++
      out.push(...alignTable(lines.slice(i, end)))
      i = end - 1
    } else if (/^\s*[*+]\s/.test(line) && !thematicBreak.test(line))
      out.push(line.replace(/^(\s*)[*+]/, '$1-'))
    else out.push(line)
  }
  while (out[0] === '') out.shift()
  while (out[out.length - 1] === '') out.pop()
  return out
}

function alignTable(rows: string[]) {
  const cells = rows.map(splitRow)
  const columns = Math.max(...cells.map(c => c.length))
  const align = cells[1].map(c => [c.startsWith(':'), c.endsWith(':')] as const)
  const widths = Array.from({ length: columns }, (_, col) =>
    Math.max(3, ...cells.map((row, r) => (r === 1 ? 3 : width(row[col] ?? '')))),
  )
  return cells.map((row, r) => {
    const padded = widths.map((w, col) => {
      if (r !== 1) return pad(row[col] ?? '', w)
      const [left, right] = align[col] ?? [false, false]
      return `${left ? ':' : '-'}${'-'.repeat(w - 2)}${right ? ':' : '-'}`
    })
    return `| ${padded.join(' | ')} |`
  })
}

function splitRow(row: string) {
  const cells: string[] = []
  let cell = ''
  const text = row.trim()
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '\\' && text[i + 1] === '|') {
      cell += '\\|'
      i++
    } else if (char === '|') {
      cells.push(cell.trim())
      cell = ''
    } else cell += char
  }
  cells.push(cell.trim())
  if (text.startsWith('|')) cells.shift()
  if (text.endsWith('|') && !text.endsWith('\\|')) cells.pop()
  return cells
}

function pad(text: string, size: number) {
  return text + ' '.repeat(size - width(text))
}

function width(text: string) {
  return [...text].reduce(
    (sum, char) =>
      sum + (/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]|\p{Extended_Pictographic}/u.test(char) ? 2 : 1),
    0,
  )
}
