import { parsePresentation, UNTITLED } from './presentation'

export type SavedPresentation = {
  id: string
  name: string
  source: string
  userNamed: boolean
  updatedAt: number
}
export type Library = { current: string; items: SavedPresentation[] }

const STORAGE_KEY = 'kiosk-presentations'

export function blankPresentation(heading: string, body: string) {
  return `---\ntheme: room-dark\n---\n\n# ${heading}\n\n${body}\n`
}

export function loadLibrary(example: string, untitled: string): Library {
  const stored = read()
  if (stored?.items.length)
    return {
      current: stored.items.some(p => p.id === stored.current)
        ? stored.current
        : stored.items[0].id,
      items: stored.items,
    }
  const first = {
    ...createPresentation(presentationName(example) || untitled, example, []),
    userNamed: true,
  }
  return { current: first.id, items: [first] }
}

export function saveLibrary(library: Library) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library))
  } catch {}
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
    return presentation.slides[0].heading
      .map(part => part.text)
      .join('')
      .trim()
  } catch {
    return ''
  }
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
