export function setFrontMatter(source: string, key: string, value?: string): string {
  const lines = source.split('\n')
  const end =
    lines[0]?.trim() === '---' ? lines.findIndex((l, i) => i > 0 && l.trim() === '---') : -1
  if (end < 0) return value === undefined ? source : `---\n${key}: ${value}\n---\n\n${source}`
  const inside = (i: number) => i > 0 && i < end
  const top = lines.findIndex((l, i) => inside(i) && l.startsWith(`${key}:`))
  const nested = new RegExp(`^\\s+${key}:`)
  const index = top > 0 ? top : lines.findIndex((l, i) => inside(i) && nested.test(l))
  if (value === undefined) {
    if (index > 0) lines.splice(index, 1)
    return (index === top ? lines : dropEmptyParents(lines)).join('\n')
  }
  if (index > 0) lines[index] = `${lines[index].match(/^\s*/)![0]}${key}: ${value}`
  else lines.splice(end, 0, `${key}: ${value}`)
  return lines.join('\n')
}

function dropEmptyParents(lines: string[]) {
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  return lines.filter(
    (line, i) => !(i > 0 && i < end && /^[\w-]+:\s*$/.test(line) && !/^\s/.test(lines[i + 1])),
  )
}
