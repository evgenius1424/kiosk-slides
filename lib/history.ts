export type History = Record<string, string[]>

export const KEPT_VERSIONS = 20
export const STORED_VERSIONS = 5
export const STORED_LENGTH = 1_000_000

const STORAGE_KEY = 'kiosk-versions'

export function addVersion(history: History, id: string, source: string): History {
  const versions = history[id] ?? []
  if (versions.at(-1) === source) return history
  return { ...history, [id]: [...versions, source].slice(-KEPT_VERSIONS) }
}

export function takeVersion(history: History, id: string) {
  const versions = history[id] ?? []
  const source = versions.at(-1)
  if (source === undefined) return null
  return { history: { ...history, [id]: versions.slice(0, -1) }, source }
}

export function forgetVersions(history: History, id: string): History {
  const { [id]: _, ...rest } = history
  return rest
}

export function storedHistory(history: History, limit = STORED_LENGTH): History {
  const recent = Object.entries(history).map(
    ([id, versions]) => [id, versions.slice(-STORED_VERSIONS).reverse()] as const,
  )
  const kept: History = {}
  let length = 0
  for (let depth = 0; depth < STORED_VERSIONS; depth++)
    for (const [id, versions] of recent) {
      const source = versions[depth]
      if (source === undefined || length + source.length > limit) continue
      length += source.length
      kept[id] = [source, ...(kept[id] ?? [])]
    }
  return kept
}

export function loadHistory(): History {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

export function saveHistory(history: History) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedHistory(history)))
  } catch {}
}
