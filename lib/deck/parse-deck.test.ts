import { describe, expect, it } from 'vitest'
import { parseDeck } from '@/lib/deck'

const md = (...lines: string[]) => lines.join('\n')

describe('parseDeck: deck and message slides', () => {
  it('reads deck front matter and a message slide', () => {
    const deck = parseDeck(md(
      '---',
      'title: Demo deck',
      'theme: room-light',
      'autoplay:',
      '  duration: 20s',
      '  loop: false',
      '---',
      '',
      '# Make your point ==impossible to miss==',
      '',
      'Big type. One idea.',
    ))
    expect(deck).toEqual({
      title: 'Demo deck', duration: 20, loop: false,
      slides: [{
        kind: 'message', title: '', label: '', footer: '', layout: 'auto',
        heading: 'Make your point ==impossible to miss==', body: 'Big type. One idea.',
      }],
    })
  })

  it('reads slide chrome from the comment after the separator', () => {
    const deck = parseDeck(md(
      '# First',
      '---',
      '<!--',
      'title: Opening',
      'label: Core concept',
      'footer: One point per slide.',
      'layout: split-left',
      'duration: 8s',
      '-->',
      '# Second',
    ))
    expect(deck.slides[1]).toEqual({
      kind: 'message', title: 'Opening', label: 'Core concept', footer: 'One point per slide.',
      layout: 'split-left', duration: 8, heading: 'Second', body: '',
    })
  })

  it('splits slides on bare --- lines but not inside code fences', () => {
    const deck = parseDeck(md('# One', '---', '# Two', '---', '', '# Three'))
    expect(deck.slides.map(s => s.heading)).toEqual(['One', 'Two', 'Three'])
  })
})

describe('parseDeck: widgets', () => {
  it('turns a flat numbered list into steps', () => {
    const [slide] = parseDeck(md(
      '# Three ==steps==',
      '',
      'Intro.',
      '',
      '1. Gather the **material**.',
      '2. Generate a deck.',
      '3. Present.',
    )).slides
    expect(slide).toEqual({
      kind: 'steps', title: '', label: '', footer: '', layout: 'auto',
      heading: 'Three ==steps==', body: 'Intro.',
      steps: ['Gather the **material**.', 'Generate a deck.', 'Present.'],
    })
  })

  it('turns a fenced code block into code, even when it contains ---', () => {
    const [slide] = parseDeck(md(
      '# Keep it ==simple==',
      '',
      '```html',
      '<h1>One idea.</h1>',
      '---',
      '<p>Make it count.</p>',
      '```',
    )).slides
    expect(slide).toEqual({
      kind: 'code', title: '', label: '', footer: '', layout: 'auto',
      heading: 'Keep it ==simple==', body: '',
      language: 'html', code: '<h1>One idea.</h1>\n---\n<p>Make it count.</p>',
    })
  })

  it('turns a markdown image into image', () => {
    const [slide] = parseDeck(md(
      '# Look at ==this==',
      '',
      '![A kiosk screen](https://example.com/kiosk.png "Seen from the back row")',
    )).slides
    expect(slide).toEqual({
      kind: 'image', title: '', label: '', footer: '', layout: 'auto',
      heading: 'Look at ==this==', body: '',
      src: 'https://example.com/kiosk.png', alt: 'A kiosk screen', caption: 'Seen from the back row',
    })
  })

  it('accepts /images/ paths and embedded image data', () => {
    expect(parseDeck(md('# A', '', '![x](/images/a.png)')).slides[0]).toMatchObject({ kind: 'image', src: '/images/a.png', caption: '' })
    expect(parseDeck(md('# A', '', '![x](data:image/png;base64,AAAA)')).slides[0]).toMatchObject({ kind: 'image', src: 'data:image/png;base64,AAAA' })
  })
})

describe('parseDeck: metric', () => {
  const error = (source: string) => { try { parseDeck(source) } catch (e) { return (e as Error).message } return 'no error' }

  it('turns an annotated bold value and caption line into a metric', () => {
    const [slide] = parseDeck(md(
      '# Short decks ==land==',
      '',
      '<!-- metric -->',
      '**3x**',
      'more questions answered at the booth',
    )).slides
    expect(slide).toEqual({
      kind: 'metric', title: '', label: '', footer: '', layout: 'auto',
      heading: 'Short decks ==land==', body: '',
      value: '3x', caption: 'more questions answered at the booth',
    })
  })

  it('requires a bold value line', () => {
    expect(error(md('# M', '', '<!-- metric -->', '3x', 'caption'))).toBe('Line 4: A metric starts with a bold value line, such as **3x**.')
    expect(error(md('# M', '', '<!-- metric -->', '- a'))).toBe('Line 4: A metric starts with a bold value line, such as **3x**.')
  })

  it('requires a caption line right after the value', () => {
    expect(error(md('# M', '', '<!-- metric -->', '**3x**'))).toBe('Line 4: Add a caption line directly below the metric’s bold value.')
  })
})

describe('parseDeck: errors', () => {
  const error = (source: string) => { try { parseDeck(source) } catch (e) { return (e as Error).message } return 'no error' }

  it('rejects an unknown chrome setting', () => {
    expect(error(md('<!--', 'title: x', 'colour: red', '-->', '# Hi'))).toBe('Line 1: Unsupported slide setting: colour: red')
  })

  it('rejects a bad layout and a bad duration', () => {
    expect(error(md('# One', '---', '<!-- layout: wide -->', '# Hi'))).toBe('Line 3: Layout must be auto, stacked, or split-left.')
    expect(error(md('<!-- duration: 8 -->', '# Hi'))).toBe('Line 1: Use a duration such as 12s.')
  })

  it('requires exactly one # heading', () => {
    expect(error(md('# One', '---', 'Just a body.'))).toBe('Line 3: Each slide needs exactly one # heading.')
    expect(error(md('# One', '', '# Two'))).toBe('Line 3: Each slide needs exactly one # heading.')
  })

  it('requires ==highlight== spans to be closed', () => {
    expect(error(md('', '# Make it ==count'))).toBe('Line 2: Close the ==highlight== span.')
  })

  it('caps code at 12 lines', () => {
    const code = Array.from({ length: 13 }, (_, i) => `line ${i}`)
    expect(error(md('# Code', '', '```js', ...code, '```'))).toBe('Line 3: Shorten code to 12 lines or split this slide.')
  })

  it('rejects an image that is not HTTPS, /images/, or embedded data', () => {
    expect(error(md('# Pic', '', '![x](http://example.com/a.png)'))).toBe('Line 3: Use an HTTPS image URL or embedded image data.')
  })

  it('allows one supporting widget per slide', () => {
    expect(error(md('# Two', '', '1. One', '2. Two', '', '```js', 'x', '```'))).toBe('Line 6: Use one supporting widget per slide.')
  })

  it('rejects nested step lists', () => {
    expect(error(md('# Steps', '', '1. One', '   1. Sub', '2. Two'))).toBe('Line 3: Flatten the list — nesting isn’t supported.')
  })

  it('caps steps at five', () => {
    expect(error(md('# Steps', '', '1. a', '2. b', '3. c', '4. d', '5. e', '6. f'))).toBe('Line 3: Use at most five steps.')
  })

  it('rejects markdown the format does not support', () => {
    expect(error(md('# Hi', '', '- a bullet'))).toBe('Line 3: This slide has markdown the format doesn’t support (list). Use a numbered list for steps, or annotate the block.')
    expect(error(md('# Hi', '', '## Sub'))).toBe('Line 3: This slide has markdown the format doesn’t support (heading). Use one # heading per slide.')
  })

  it('rejects an annotation with an unknown type', () => {
    expect(error(md('# Hi', '', '<!-- sparkle -->', '- a'))).toMatch(/^Line 3: Unknown annotation “sparkle”\./)
  })

  it('points slide settings placed after the heading back above it', () => {
    expect(error(md('# Hi', '<!-- title: Opening -->', 'Body.'))).toMatch(/^Line 2: Unknown annotation “title”\. Slide settings go in the comment above the # heading\./)
  })

  it('rejects an annotation that is not directly above a block', () => {
    const message = 'Put the <!-- … --> comment on the line directly above the block it annotates.'
    expect(error(md('# Hi', '', '<!-- sparkle -->'))).toBe(`Line 3: ${message}`)
    expect(error(md('# Hi', '', '<!-- sparkle -->', '', '- a'))).toBe(`Line 3: ${message}`)
  })

  it('rejects an unclosed code fence', () => {
    expect(error(md('# One', '```js', 'x'))).toBe('Close the code block with ```')
  })
})

describe('parseDeck: chart', () => {
  const error = (source: string) => { try { parseDeck(source) } catch (e) { return (e as Error).message } return 'no error' }

  it('turns an annotated table into a chart, first column as labels and the rest as series', () => {
    const [slide] = parseDeck(md(
      '# Visits ==doubled==',
      '',
      '<!-- chart: type=bar -->',
      '| Month | Visits | Signups |',
      '| --- | --- | --- |',
      '| Jan | 120 | 8 |',
      '| Feb | 1,450 | 12.5 |',
    )).slides
    expect(slide).toEqual({
      kind: 'chart', title: '', label: '', footer: '', layout: 'auto',
      heading: 'Visits ==doubled==', body: '',
      type: 'bar', labels: ['Jan', 'Feb'],
      series: [{ name: 'Visits', values: [120, 1450] }, { name: 'Signups', values: [8, 12.5] }],
    })
  })

  it('uses the x column for labels and the y column as the only series', () => {
    const [slide] = parseDeck(md(
      '# Revenue',
      '',
      '<!-- chart: type=line x=Quarter y=Revenue -->',
      '| Region | Quarter | Revenue | Cost |',
      '| --- | --- | --- | --- |',
      '| EU | Q1 | 10 | 4 |',
      '| EU | Q2 | 14 | 5 |',
    )).slides
    expect(slide).toMatchObject({ kind: 'chart', type: 'line', labels: ['Q1', 'Q2'], series: [{ name: 'Revenue', values: [10, 14] }] })
  })

  it('with only x given, charts every other column', () => {
    const [slide] = parseDeck(md(
      '# Costs', '',
      '<!-- chart: type=bar x=Quarter -->',
      '| Cost | Quarter | Revenue |', '| --- | --- | --- |', '| 4 | Q1 | 10 |',
    )).slides
    expect(slide).toMatchObject({ labels: ['Q1'], series: [{ name: 'Cost', values: [4] }, { name: 'Revenue', values: [10] }] })
  })

  const table = ['| Month | Visits |', '| --- | --- |', '| Jan | 1 |']

  it('requires type=bar or type=line', () => {
    expect(error(md('# C', '', '<!-- chart -->', ...table))).toBe('Line 3: A chart needs type=bar or type=line.')
    expect(error(md('# C', '', '<!-- chart: type=pie -->', ...table))).toBe('Line 3: A chart needs type=bar or type=line.')
  })

  it('needs a table under the chart annotation', () => {
    expect(error(md('# C', '', '<!-- chart: type=bar -->', '- Jan 1'))).toBe('Line 4: Put a table directly under <!-- chart -->.')
  })

  it('caps a chart at 5 columns and 6 rows', () => {
    const cap = 'Line 4: A chart supports at most 5 columns and 6 rows. Trim the table or split the slide.'
    const wide = ['| a | b | c | d | e | f |', '|---|---|---|---|---|---|', '| x | 1 | 2 | 3 | 4 | 5 |']
    expect(error(md('# C', '', '<!-- chart: type=bar -->', ...wide))).toBe(cap)
    const tall = Array.from({ length: 7 }, (_, i) => `| m${i} | ${i} |`)
    expect(error(md('# C', '', '<!-- chart: type=line -->', '| Month | Visits |', '| --- | --- |', ...tall))).toBe(cap)
    const six = tall.slice(0, 6)
    expect(error(md('# C', '', '<!-- chart: type=line -->', '| Month | Visits |', '| --- | --- |', ...six))).toBe('no error')
  })

  it('rejects x or y naming a column the table does not have', () => {
    expect(error(md('# C', '', '<!-- chart: type=bar y=Sales -->', ...table))).toBe('Line 3: The table has no “Sales” column. Use one of: Month, Visits.')
    expect(error(md('# C', '', '<!-- chart: type=bar x=Day -->', ...table))).toBe('Line 3: The table has no “Day” column. Use one of: Month, Visits.')
  })

  it('needs at least one data column', () => {
    expect(error(md('# C', '', '<!-- chart: type=bar -->', '| Month |', '| --- |', '| Jan |'))).toBe('Line 4: A chart needs a label column and at least one number column.')
  })

  it('rejects a data cell that is not a number', () => {
    expect(error(md('# C', '', '<!-- chart: type=bar -->', '| Month | Visits |', '| --- | --- |', '| Jan | 1 |', '| Feb | lots |')))
      .toBe('Line 7: “lots” in the Visits column isn’t a number.')
  })
})

describe('parseDeck: buttons', () => {
  const error = (source: string) => { try { parseDeck(source) } catch (e) { return (e as Error).message } return 'no error' }

  it('turns an annotated bullet list of links into buttons', () => {
    const [slide] = parseDeck(md(
      '# Try it ==yourself==',
      '',
      '<!-- buttons -->',
      '- [View the repo](https://github.com/example/repo)',
      '- [See the product](https://example.com)',
    )).slides
    expect(slide).toEqual({
      kind: 'buttons', title: '', label: '', footer: '', layout: 'auto',
      heading: 'Try it ==yourself==', body: '',
      buttons: [
        { label: 'View the repo', url: 'https://github.com/example/repo' },
        { label: 'See the product', url: 'https://example.com' },
      ],
    })
  })

  it('caps buttons at three', () => {
    const links = ['a', 'b', 'c', 'd'].map(x => `- [${x}](https://example.com/${x})`)
    expect(error(md('# Go', '', '<!-- buttons -->', ...links))).toBe('Line 4: Use at most 3 buttons.')
  })

  it('rejects a button link that is not https://', () => {
    expect(error(md('# Go', '', '<!-- buttons -->', '- [Repo](https://example.com)', '- [Docs](http://example.com)')))
      .toBe('Line 5: Button links must be https:// URLs.')
  })

  it('rejects a bullet that is not a single link', () => {
    expect(error(md('# Go', '', '<!-- buttons -->', '- [Repo](https://example.com)', '- just text')))
      .toBe('Line 5: Each button must be a single [Label](https://...) link.')
  })

  it('rejects a buttons annotation above something other than a bullet list', () => {
    expect(error(md('# Go', '', '<!-- buttons -->', '1. [Repo](https://example.com)')))
      .toBe('Line 4: Buttons must be a bullet list of [Label](https://...) links.')
  })
})
