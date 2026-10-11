export function setFrontMatter(source: string, key: string, value?: string): string {
  const lines = source.split('\n')
  const end = lines[0]?.trim() === '---' ? lines.findIndex((l, i) => i > 0 && l.trim() === '---') : -1
  if (end < 0) return value === undefined ? source : `---\n${key}: ${value}\n---\n\n${source}`
  const index = lines.findIndex((l, i) => i > 0 && i < end && l.startsWith(`${key}:`))
  if (value === undefined) { if (index > 0) lines.splice(index, 1) }
  else if (index > 0) lines[index] = `${key}: ${value}`
  else lines.splice(end, 0, `${key}: ${value}`)
  return lines.join('\n')
}
