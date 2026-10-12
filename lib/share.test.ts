import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parsePresentation, presentationLook } from '@/lib/presentation'
import {
  SHARE_PREFIX,
  decodeShare,
  encodeShare,
  readShareHash,
  shareLink,
  shareSlideHash,
} from './share'

const SITE = 'https://kiosk-slides.vercel.app'
const example = readFileSync(path.join(process.cwd(), 'public/example.md'), 'utf8')
const cyrillic = `---
theme: room-light
tone: plum
transition: slide
---

# Привет, **команда**

Короткие слайды для большого экрана.

---

# Итоги квартала

1. Рост на 24 %
2. Новые клиенты
`

describe('share links', () => {
  it('round-trips the example with its whole look', async () => {
    const link = await shareLink(example, SITE)
    if (!('url' in link)) throw new Error('example should fit in a link')
    expect(link.url.startsWith(`${SITE}/${SHARE_PREFIX}1`)).toBe(true)
    expect(link.url.length).toBeLessThan(4_000)
    const hash = new URL(link.url).hash
    const source = await decodeShare(readShareHash(hash)!.payload)
    expect(source).toBe(example)
    const shared = parsePresentation(source)
    const original = parsePresentation(example)
    expect(shared).toEqual(original)
    expect(presentationLook(shared)).toEqual(presentationLook(original))
  })

  it('round-trips Cyrillic text', async () => {
    const source = await decodeShare(await encodeShare(cyrillic))
    expect(source).toBe(cyrillic)
    expect(JSON.stringify(parsePresentation(source).slides[1])).toContain('Итоги квартала')
  })

  it('keeps the payload URL-safe', async () => {
    expect(await encodeShare(example)).toMatch(/^1[\w-]+$/)
  })

  it('rejects truncated and unknown links', async () => {
    const payload = await encodeShare(example)
    await expect(decodeShare(payload.slice(0, payload.length / 2))).rejects.toThrow(
      'Broken share link',
    )
    await expect(decodeShare(`9${payload.slice(1)}`)).rejects.toThrow('Broken share link')
    await expect(decodeShare('1%%%')).rejects.toThrow('Broken share link')
  })

  it('refuses presentations that are too big or embed images', async () => {
    const huge = Array.from({ length: 4000 }, (_, i) => `# ${Math.random()} ${i}`).join('\n---\n')
    expect(await shareLink(huge, SITE)).toEqual({ tooBig: true })
    expect(await shareLink('# Hi\n\n![](data:image/png;base64,AAAA)', SITE)).toEqual({
      tooBig: true,
    })
  })

  it('keeps the slide number next to a shared presentation', () => {
    expect(shareSlideHash('1abc', 0)).toBe('#s=1abc')
    expect(shareSlideHash('1abc', 2)).toBe('#s=1abc&3')
    expect(readShareHash('#s=1abc&3')).toEqual({ payload: '1abc', slide: '#3' })
    expect(readShareHash('#s=1abc')).toEqual({ payload: '1abc', slide: '' })
    expect(readShareHash('#3')).toBeUndefined()
  })
})
