// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { fontPreloadScript } from '@/lib/font-preload'
import { STORAGE_KEY } from '@/lib/presentations'

beforeEach(() => {
  localStorage.clear()
  document.head.innerHTML = ''
  location.hash = ''
})

describe('font preload', () => {
  it('preloads the core file of the open presentation’s font', () => {
    expect(preloaded('---\nfont: Space Grotesk\n---\n\n# Plain “quotes” — and dashes…\n')).toEqual([
      '/fonts/space-grotesk-core.woff2',
    ])
  })

  it('preloads the extended file when the text needs it', () => {
    expect(preloaded('---\nfont: inter\n---\n\n# Café\n')).toEqual(['/fonts/inter-extended.woff2'])
  })

  it('preloads nothing for the system font, a share link or an empty library', () => {
    expect(preloaded('---\ntheme: studio\n---\n\n# Plain\n')).toEqual([])
    location.hash = '#s=1abc'
    expect(preloaded('---\nfont: inter\n---\n\n# Plain\n')).toEqual([])
    location.hash = ''
    localStorage.clear()
    new Function(fontPreloadScript())()
    expect(document.head.querySelectorAll('link')).toHaveLength(0)
  })
})

function preloaded(source: string) {
  document.head.innerHTML = ''
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      current: 'b',
      items: [
        { id: 'a', source: '# Other' },
        { id: 'b', source },
      ],
    }),
  )
  new Function(fontPreloadScript())()
  return [...document.head.querySelectorAll('link')].map(link => {
    expect(link.rel).toBe('preload')
    expect(link.crossOrigin).toBe('anonymous')
    return new URL(link.href).pathname
  })
}
