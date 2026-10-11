import { describe, expect, it } from 'vitest'
import { imagePdf } from './pdf'

describe('imagePdf', () => {
  it('writes one landscape page per image with a valid cross-reference table', async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9])
    const blob = imagePdf(
      [
        { jpeg, width: 3840, height: 2160 },
        { jpeg, width: 3840, height: 2160 },
      ],
      [960, 540],
      'Слайды',
    )
    const text = new TextDecoder('latin1').decode(await blob.arrayBuffer())
    expect(blob.type).toBe('application/pdf')
    expect(text).toMatch(/^%PDF-1\.4/)
    expect(text).toContain('/Count 2')
    expect(text.match(/\/MediaBox \[0 0 960 540\]/g)).toHaveLength(2)
    expect(text).toContain('/Title <FEFF0421043B043004390434044B>')
    const xref = Number(/startxref\n(\d+)/.exec(text)![1])
    expect(text.slice(xref, xref + 4)).toBe('xref')
    const offsets = [...text.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map(m => Number(m[1]))
    offsets.forEach((offset, i) =>
      expect(text.slice(offset)).toMatch(new RegExp(`^${i + 1} 0 obj`)),
    )
  })
})
