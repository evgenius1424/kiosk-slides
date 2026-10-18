/** A block annotation: `<!-- type -->` or `<!-- type: key=value key=value -->`, on the line directly above a block. */
export type Annotation = { type: string; args: Record<string, string> }

const settingKeys = ['title', 'label', 'footer', 'duration']

/**
 * Parse one annotation comment. When `known` is given, an unknown type is rejected
 * before its settings are looked at, so the author sees the more useful error first.
 */
export function parseAnnotation(
  comment: string,
  fail: (message: string) => never,
  known?: readonly string[],
): Annotation {
  const inner = comment.trim().replace(/^<!--/, '').replace(/-->$/, '').trim()
  const [, type, rest] = inner.match(/^([a-z][\w-]*)(?::([\s\S]*))?$/) ?? []
  if (!type) return fail('Write an annotation as <!-- type --> or <!-- type: key=value -->.')
  if (known && !known.includes(type)) {
    const options = known.length ? ` Use one of: ${known.join(', ')}.` : ''
    const hint = settingKeys.includes(type)
      ? ' Slide settings go in the comment above the # heading.'
      : ''
    fail(`Unknown annotation “${type}”.${hint}${options}`)
  }
  const args: Record<string, string> = {}
  for (const pair of (rest ?? '').trim().split(/\s+/).filter(Boolean)) {
    const [, key, value] = pair.match(/^([\w-]+)=(\S+)$/) ?? []
    if (!key) fail(`Write annotation settings as key=value pairs, e.g. <!-- chart: type=bar -->.`)
    args[key] = value
  }
  return { type, args }
}
