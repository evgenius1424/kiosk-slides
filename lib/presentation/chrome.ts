import type { SlideChrome } from './types'

type Chrome = Pick<SlideChrome, 'title' | 'label' | 'footer' | 'duration'>

export const defaultChrome = (): Chrome => ({ title: '', label: '', footer: '' })

/** Parse the per-slide settings comment: `<!--` then `key: value` lines then `-->`. */
export function parseChrome(comment: string, fail: (message: string) => never): Chrome {
  const chrome = defaultChrome()
  const lines = comment
    .replace(/^\s*<!--/, '')
    .replace(/-->\s*$/, '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
  for (const line of lines) {
    const [, key, value = ''] = line.match(/^([\w-]+):\s*(.*)$/) ?? []
    if (key === 'title' || key === 'label' || key === 'footer') chrome[key] = value
    else if (key === 'duration') {
      if (!/^\d+s$/.test(value)) fail('Use a duration such as 12s.')
      chrome.duration = Number(value.slice(0, -1))
    } else fail(`Unsupported slide setting: ${line}`)
  }
  return chrome
}
