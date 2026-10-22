import { formatPresentation, headingText, parsePresentation, UNTITLED } from './presentation'

export type SavedPresentation = {
  id: string
  name: string
  source: string
  userNamed: boolean
  updatedAt: number
}
export type Library = { current: string; items: SavedPresentation[] }

export const STORAGE_KEY = 'kiosk-presentations'
const FRONT_MATTER = /^---\n[\s\S]*?\n---(\n|$)/
const HEADING = /^# \S/m
const OUTER_FENCE = /^(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n\1\s*$/

export function blankPresentation(heading: string, body: string) {
  return `---\ntheme: room-dark\n---\n\n# ${heading}\n\n${body}\n`
}

export function loadLibrary(blank: string, untitled: string): Library {
  const stored = read()
  if (stored?.items.length)
    return {
      current: stored.items.some(p => p.id === stored.current)
        ? stored.current
        : stored.items[0].id,
      items: stored.items,
    }
  const first = createPresentation(untitled, blank, [])
  return { current: first.id, items: [first] }
}

export function saveLibrary(base: Library, library: Library) {
  const merged = mergeLibrary(base, library, read())
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } catch {}
  return merged
}

export function refreshLibrary(base: Library, library: Library) {
  const stored = read()
  return { base: stored ?? base, library: mergeLibrary(base, library, stored) }
}

export function mergeLibrary(base: Library, ours: Library, theirs: Library | null): Library {
  if (!theirs) return ours
  const before = byId(base.items)
  const mine = byId(ours.items)
  const other = byId(theirs.items)
  const ids = new Set([...theirs.items, ...ours.items].map(p => p.id))
  const items = [...ids].flatMap(id => {
    const own = mine.get(id)
    const kept = same(own, before.get(id)) ? other.get(id) : own
    return kept ? [same(kept, own) ? own! : kept] : []
  })
  if (!items.length) return ours
  const current = items.some(p => p.id === ours.current)
    ? ours.current
    : items.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a)).id
  const unchanged =
    current === ours.current &&
    items.length === ours.items.length &&
    items.every((p, i) => p === ours.items[i])
  return unchanged ? ours : { current, items }
}

export function createPresentation(
  name: string,
  source: string,
  existing: SavedPresentation[],
): SavedPresentation {
  return {
    id: newId(),
    name: uniqueName(name, existing),
    source,
    userNamed: false,
    updatedAt: Date.now(),
  }
}

export function uniqueName(name: string, existing: SavedPresentation[], ignore?: string) {
  const taken = new Set(existing.filter(p => p.id !== ignore).map(p => p.name.toLowerCase()))
  if (!taken.has(name.toLowerCase())) return name
  let n = 2
  while (taken.has(`${name} ${n}`.toLowerCase())) n++
  return `${name} ${n}`
}

export function presentationName(source: string) {
  try {
    const presentation = parsePresentation(source)
    if (presentation.title !== UNTITLED) return presentation.title.trim()
    return headingText(presentation.slides[0].heading).trim()
  } catch {
    return ''
  }
}

export function pastedPresentation(text: string) {
  const source = unfence(text.replace(/\r\n?/g, '\n').trim())
  if (!FRONT_MATTER.test(source) && !HEADING.test(source)) return null
  return formatPresentation(`${source}\n`)
}

function unfence(text: string) {
  return text.match(OUTER_FENCE)?.[2].trim() ?? text
}

function byId(items: SavedPresentation[]) {
  return new Map(items.map(p => [p.id, p]))
}

function same(a?: SavedPresentation, b?: SavedPresentation) {
  return a === b || (!!a && !!b && JSON.stringify(a) === JSON.stringify(b))
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function read(): Library | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return value && Array.isArray(value.items) ? value : null
  } catch {
    return null
  }
}
