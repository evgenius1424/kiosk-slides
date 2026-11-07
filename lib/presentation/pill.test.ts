import { describe, expect, it } from 'vitest'
import { PILL_GLYPHS, pillFonts } from './pill-fonts'
import { fonts } from './look'
import { pillEdges, tallPill } from './pill'

describe('pill metrics', () => {
  it.each(fonts.map(f => f.id))('cover every glyph of the %s font', id => {
    const metrics = pillFonts[id]
    for (const list of [metrics.starts, metrics.ends, metrics.italicStarts, metrics.italicEnds])
      expect(list).toHaveLength(PILL_GLYPHS.length)
    expect(metrics.radius).toBeLessThanOrEqual((metrics.top + metrics.bottom) / 2)
  })

  it('pulls each end to the ink of its outer letter', () => {
    const { starts, ends } = pillFonts.inter
    expect(pillEdges(' present ', 'inter')).toEqual({
      start: starts[PILL_GLYPHS.indexOf('p')],
      end: ends[PILL_GLYPHS.indexOf('t')],
    })
    expect(pillEdges('code', 'inter', true).start).toBe(
      pillFonts.inter.italicStarts[PILL_GLYPHS.indexOf('c')],
    )
  })

  it('treats unknown symbols as their own box and emoji as emoji', () => {
    expect(pillEdges('→', 'inter')).toEqual({ start: 0, end: 0 })
    expect(pillEdges('🚀', 'inter')).toEqual(pillEdges('😀', 'inter'))
  })

  it('makes room for accents, tall marks and emoji', () => {
    expect(tallPill('Ёлка')).toBe(true)
    expect(tallPill('café')).toBe(true)
    expect(tallPill('ship ✅')).toBe(true)
    expect(tallPill('Ship it (now)')).toBe(false)
  })
})
