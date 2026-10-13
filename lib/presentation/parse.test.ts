import { describe, expect, it } from 'vitest'
import {
  defaultTone,
  parsePresentation,
  setPresentationTheme,
  setFrontMatter,
  insertSlide,
  removeSlide,
  replaceSlide,
  slideLines,
  slideSource,
} from '@/lib/presentation'

const md = (...lines: string[]) => lines.join('\n')

describe('parsePresentation: presentation and message slides', () => {
  it('reads presentation front matter and a message slide', () => {
    const presentation = parsePresentation(
      md(
        '---',
        'title: Demo presentation',
        'theme: room-light',
        'autoplay:',
        '  duration: 20s',
        '  loop: false',
        '---',
        '',
        '# Make your point **impossible to miss**',
        '',
        'Big type. One idea.',
      ),
    )
    expect(presentation).toEqual({
      title: 'Demo presentation',
      theme: 'room-light',
      tone: defaultTone('room-light'),
      transition: 'gentle',
      shareSafe: false,
      credit: true,
      duration: 20,
      loop: false,
      font: 'classic',
      scale: 'normal',
      brand: 'kiosk',
      slides: [
        {
          kind: 'message',
          title: '',
          label: '',
          footer: '',
          layout: 'auto',
          heading: [{ text: 'Make your point ' }, { text: 'impossible to miss', highlight: true }],
          body: 'Big type. One idea.',
        },
      ],
    })
  })

  it('reads the font, scale and brand', () => {
    const presentation = parsePresentation(
      md('---', 'font: Archivo Expanded', 'scale: hero', 'brand: ZEOS', '---', '# Hi'),
    )
    expect([presentation.font, presentation.scale, presentation.brand]).toEqual([
      'archivo-expanded',
      'hero',
      'ZEOS',
    ])
    expect(parsePresentation(md('---', 'brand: none', '---', '# Hi')).brand).toBe('')
  })

  it('reads the tone, transition and screen-share safe flag', () => {
    const presentation = parsePresentation(
      md('---', 'tone: Coral', 'transition: Slide', 'share-safe: true', '---', '# Hi'),
    )
    expect([presentation.tone, presentation.transition, presentation.shareSafe]).toEqual([
      '#ff8577',
      'slide',
      true,
    ])
    expect(parsePresentation(md('---', 'tone: #123abc', '---', '# Hi')).tone).toBe('#123abc')
  })

  it('pairs each tone and the black and white default with the theme', () => {
    const tone = (...lines: string[]) => parsePresentation(md('---', ...lines, '---', '# Hi')).tone
    expect(tone('theme: room-light')).toBe('#000000')
    expect(tone('theme: studio')).toBe('#ffffff')
    expect(tone('theme: room-light', 'tone: teal')).toBe('#0f7f76')
    expect(tone('tone: teal', 'theme: studio')).toBe('#5fe3d6')
  })

  it('still reads the earlier tone and scale names', () => {
    const presentation = parsePresentation(md('---', 'tone: wine', 'scale: kiosk', '---', '# Hi'))
    expect([presentation.tone, presentation.scale]).toEqual(['#ff8577', 'hero'])
    expect(parsePresentation(md('---', 'tone: graphite', '---', '# Hi')).tone).toBe('#ffffff')
  })

  it('reads the credit flag', () => {
    expect(parsePresentation('# Hi').credit).toBe(true)
    expect(parsePresentation(md('---', 'credit: false', '---', '# Hi')).credit).toBe(false)
    expect(() => parsePresentation(md('---', 'credit: off', '---', '# Hi'))).toThrow(
      'Line 2: Set credit to true or false, not “off”.',
    )
  })

  it('defaults the theme to room-dark', () => {
    expect(parsePresentation('# Hi').theme).toBe('room-dark')
    expect(parsePresentation(md('---', 'title: T', '---', '# Hi')).theme).toBe('room-dark')
  })

  it('reads slide chrome from the comment after the separator', () => {
    const presentation = parsePresentation(
      md(
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
      ),
    )
    expect(presentation.slides[1]).toEqual({
      kind: 'message',
      title: 'Opening',
      label: 'Core concept',
      footer: 'One point per slide.',
      layout: 'split-left',
      duration: 8,
      heading: [{ text: 'Second' }],
      body: '',
    })
  })

  it('splits slides on bare --- lines but not inside code fences', () => {
    const presentation = parsePresentation(md('# One', '---', '# Two', '---', '', '# Three'))
    expect(presentation.slides.map(s => s.heading[0].text)).toEqual(['One', 'Two', 'Three'])
  })
})

describe('parsePresentation: widgets', () => {
  it('turns a flat numbered list into steps', () => {
    const [slide] = parsePresentation(
      md(
        '# Three **steps**',
        '',
        'Intro.',
        '',
        '1. Gather the **material**.',
        '2. Generate a presentation.',
        '3. Present.',
      ),
    ).slides
    expect(slide).toEqual({
      kind: 'steps',
      title: '',
      label: '',
      footer: '',
      layout: 'auto',
      heading: [{ text: 'Three ' }, { text: 'steps', highlight: true }],
      body: 'Intro.',
      steps: ['Gather the **material**.', 'Generate a presentation.', 'Present.'],
    })
  })

  it('turns a fenced code block into code, even when it contains ---', () => {
    const [slide] = parsePresentation(
      md(
        '# Keep it **simple**',
        '',
        '```html',
        '<h1>One idea.</h1>',
        '---',
        '<p>Make it count.</p>',
        '```',
      ),
    ).slides
    expect(slide).toEqual({
      kind: 'code',
      title: '',
      label: '',
      footer: '',
      layout: 'auto',
      heading: [{ text: 'Keep it ' }, { text: 'simple', highlight: true }],
      body: '',
      language: 'html',
      code: '<h1>One idea.</h1>\n---\n<p>Make it count.</p>',
    })
  })

  it('turns a markdown image into image', () => {
    const [slide] = parsePresentation(
      md(
        '# Look at **this**',
        '',
        '![A kiosk screen](https://example.com/kiosk.png "Seen from the back row")',
      ),
    ).slides
    expect(slide).toEqual({
      kind: 'image',
      title: '',
      label: '',
      footer: '',
      layout: 'auto',
      heading: [{ text: 'Look at ' }, { text: 'this', highlight: true }],
      body: '',
      src: 'https://example.com/kiosk.png',
      alt: 'A kiosk screen',
      caption: 'Seen from the back row',
    })
  })

  it('accepts /images/ paths and embedded image data', () => {
    expect(parsePresentation(md('# A', '', '![x](/images/a.png)')).slides[0]).toMatchObject({
      kind: 'image',
      src: '/images/a.png',
      caption: '',
    })
    expect(
      parsePresentation(md('# A', '', '![x](data:image/png;base64,AAAA)')).slides[0],
    ).toMatchObject({
      kind: 'image',
      src: 'data:image/png;base64,AAAA',
    })
  })
})

describe('parsePresentation: metric', () => {
  const error = (source: string) => {
    try {
      parsePresentation(source)
    } catch (e) {
      return (e as Error).message
    }
    return 'no error'
  }

  it('turns an annotated bold value and caption line into a metric', () => {
    const [slide] = parsePresentation(
      md(
        '# Short talks **land**',
        '',
        '<!-- metric -->',
        '**3x**',
        'more questions answered at the booth',
      ),
    ).slides
    expect(slide).toEqual({
      kind: 'metric',
      title: '',
      label: '',
      footer: '',
      layout: 'auto',
      heading: [{ text: 'Short talks ' }, { text: 'land', highlight: true }],
      body: '',
      value: '3x',
      caption: 'more questions answered at the booth',
    })
  })

  it('requires a bold value line', () => {
    expect(error(md('# M', '', '<!-- metric -->', '3x', 'caption'))).toBe(
      'Line 4: A metric starts with a bold value line, such as **3x**.',
    )
    expect(error(md('# M', '', '<!-- metric -->', '- a'))).toBe(
      'Line 4: A metric starts with a bold value line, such as **3x**.',
    )
  })

  it('requires a caption line right after the value', () => {
    expect(error(md('# M', '', '<!-- metric -->', '**3x**'))).toBe(
      'Line 4: Add a caption line directly below the metric’s bold value.',
    )
  })
})

describe('parsePresentation: errors', () => {
  const error = (source: string) => {
    try {
      parsePresentation(source)
    } catch (e) {
      return (e as Error).message
    }
    return 'no error'
  }

  it('rejects an unknown chrome setting', () => {
    expect(error(md('<!--', 'title: x', 'colour: red', '-->', '# Hi'))).toBe(
      'Line 1: Unsupported slide setting: colour: red',
    )
  })

  it('rejects a bad layout and a bad duration', () => {
    expect(error(md('# One', '---', '<!-- layout: wide -->', '# Hi'))).toBe(
      'Line 3: Layout must be auto, stacked, or split-left.',
    )
    expect(error(md('<!-- duration: 8 -->', '# Hi'))).toBe('Line 1: Use a duration such as 12s.')
  })

  it('requires exactly one # heading', () => {
    expect(error(md('# One', '---', 'Just a body.'))).toBe(
      'Line 3: Each slide needs exactly one # heading.',
    )
    expect(error(md('# One', '', '# Two'))).toBe('Line 3: Each slide needs exactly one # heading.')
  })

  const heading = (line: string) => parsePresentation(line).slides[0].heading

  it('reads bold, italic, code and links in the heading as parts', () => {
    expect(
      heading('# Ship **fast**, *often*, with `pnpm` and [docs](https://example.com)'),
    ).toEqual([
      { text: 'Ship ' },
      { text: 'fast', highlight: true },
      { text: ', ' },
      { text: 'often', italic: true },
      { text: ', with ' },
      { text: 'pnpm', code: true },
      { text: ' and ' },
      { text: 'docs', url: 'https://example.com' },
    ])
  })

  it('combines nested heading markup on one part', () => {
    expect(heading('# **Read [*the* guide](https://example.com)**')).toEqual([
      { text: 'Read ', highlight: true },
      { text: 'the', highlight: true, italic: true, url: 'https://example.com' },
      { text: ' guide', highlight: true, url: 'https://example.com' },
    ])
  })

  it('treats == as plain text', () => {
    expect(heading('# Make it ==count==')).toEqual([{ text: 'Make it ==count==' }])
  })

  it('requires https heading links', () => {
    expect(error(md('', '# See [docs](http://example.com)'))).toBe(
      'Line 2: Heading links must be https:// URLs.',
    )
  })

  it('rejects other inline markdown in the heading', () => {
    const hint = 'Headings support **highlight**, *italic*, `code` and [links](https://...) only.'
    expect(error(md('# Old ~~news~~'))).toBe(`Line 1: ${hint}`)
    expect(error(md('# Logo ![x](https://example.com/x.png)'))).toBe(`Line 1: ${hint}`)
  })

  it('counts visible heading text, not markup, against the cap', () => {
    const words = 'a'.repeat(113)
    expect(heading(`# **${words}**`)).toEqual([{ text: words, highlight: true }])
    expect(error(md(`# **${'a'.repeat(116)}**`))).toBe(
      'Line 1: Shorten the headline to 115 characters or split the slide.',
    )
  })

  it('caps code at 12 lines', () => {
    const code = Array.from({ length: 13 }, (_, i) => `line ${i}`)
    expect(error(md('# Code', '', '```js', ...code, '```'))).toBe(
      'Line 3: Shorten code to 12 lines or split this slide.',
    )
  })

  it('rejects an image that is not HTTPS, /images/, or embedded data', () => {
    expect(error(md('# Pic', '', '![x](http://example.com/a.png)'))).toBe(
      'Line 3: Use an HTTPS image URL or embedded image data.',
    )
  })

  it('allows one supporting widget per slide', () => {
    expect(error(md('# Two', '', '1. One', '2. Two', '', '```js', 'x', '```'))).toBe(
      'Line 6: Use one supporting widget per slide.',
    )
  })

  it('rejects nested step lists', () => {
    expect(error(md('# Steps', '', '1. One', '   1. Sub', '2. Two'))).toBe(
      'Line 3: Flatten the list — nesting isn’t supported.',
    )
  })

  it('caps steps at five', () => {
    expect(error(md('# Steps', '', '1. a', '2. b', '3. c', '4. d', '5. e', '6. f'))).toBe(
      'Line 3: Use at most five steps.',
    )
  })

  it('rejects markdown the format does not support', () => {
    expect(error(md('# Hi', '', '- a bullet'))).toBe(
      'Line 3: This slide has markdown the format doesn’t support (list). Use a numbered list for steps, or annotate the block.',
    )
    expect(error(md('# Hi', '', '## Sub'))).toBe(
      'Line 3: This slide has markdown the format doesn’t support (heading). Use one # heading per slide.',
    )
  })

  it('rejects an annotation with an unknown type', () => {
    expect(error(md('# Hi', '', '<!-- sparkle -->', '- a'))).toMatch(
      /^Line 3: Unknown annotation “sparkle”\./,
    )
  })

  it('rejects an annotation setting the widget does not take, naming the allowed ones', () => {
    expect(error(md('# Hi', '', '<!-- metric: foo=bar -->', '**3x**', 'faster'))).toBe(
      'Line 3: <!-- metric --> has no setting “foo”. It takes no settings.',
    )
    expect(error(md('# Hi', '', '<!-- flow: x=1 -->', '- A -> B'))).toBe(
      'Line 3: <!-- flow --> has no setting “x”. It takes no settings.',
    )
    expect(error(md('# Hi', '', '<!-- buttons: a=b -->', '- [Go](https://x.com)'))).toBe(
      'Line 3: <!-- buttons --> has no setting “a”. It takes no settings.',
    )
    expect(
      error(
        md(
          '# Hi',
          '',
          '<!-- chart: typ=bar -->',
          '| Month | Visits |',
          '| --- | --- |',
          '| Jan | 1 |',
        ),
      ),
    ).toBe('Line 3: <!-- chart --> has no setting “typ”. Use one of: type, x, y.')
  })

  it('points slide settings placed after the heading back above it', () => {
    expect(error(md('# Hi', '<!-- title: Opening -->', 'Body.'))).toMatch(
      /^Line 2: Unknown annotation “title”\. Slide settings go in the comment above the # heading\./,
    )
  })

  it('rejects an annotation that is not directly above a block', () => {
    const message = 'Put the <!-- … --> comment on the line directly above the block it annotates.'
    expect(error(md('# Hi', '', '<!-- sparkle -->'))).toBe(`Line 3: ${message}`)
    expect(error(md('# Hi', '', '<!-- sparkle -->', '', '- a'))).toBe(`Line 3: ${message}`)
  })

  it('rejects an unclosed code fence', () => {
    expect(error(md('# One', '', '```js', 'x'))).toBe('Line 3: Close the code block with ```')
    expect(error(md('# One', '---', '# Two', '```', 'a', '```', '```js', 'x'))).toBe(
      'Line 7: Close the code block with ```',
    )
  })

  it('rejects a presentation with no slides on line 1', () => {
    expect(error('')).toBe('Line 1: Add a slide with a # headline.')
    expect(error(md('---', 'title: Empty', '---', ''))).toBe(
      'Line 1: Add a slide with a # headline.',
    )
  })

  it('rejects a 41st slide on its own line', () => {
    const forty = Array.from({ length: 40 }, (_, i) => `# Slide ${i + 1}`).join('\n---\n')
    expect(error(forty)).toBe('no error')
    // Slide n (1-based) starts on line 2n - 1, so slide 41 starts on line 81.
    expect(error(md(forty, '---', '# Slide 41'))).toBe(
      'Line 81: Use at most 40 slides per presentation.',
    )
  })

  it('rejects an unknown font or scale on its front-matter line', () => {
    expect(error(md('---', 'title: T', 'font: comic', '---', '# Hi'))).toMatch(
      /^Line 3: Unknown font “comic”\. Use classic, inter/,
    )
    expect(error(md('---', 'scale: huge', '---', '# Hi'))).toBe(
      'Line 2: Unknown scale “huge”. Use normal, large, hero.',
    )
    expect(error(md('---', `brand: ${'x'.repeat(25)}`, '---', '# Hi'))).toBe(
      'Line 2: Keep the brand to 24 characters.',
    )
  })

  it('rejects an unknown tone, transition or share-safe value on its front-matter line', () => {
    expect(error(md('---', 'title: T', 'tone: neon', '---', '# Hi'))).toBe(
      'Line 3: Unknown tone “neon”. Use mono, violet, coral, teal, amber or a #hex color.',
    )
    expect(error(md('---', 'transition: spin', '---', '# Hi'))).toBe(
      'Line 2: Unknown transition “spin”. Use gentle, fade, slide, none.',
    )
    expect(error(md('---', 'share-safe: yes', '---', '# Hi'))).toBe(
      'Line 2: Set share-safe to true or false, not “yes”.',
    )
  })

  it('rejects an unknown theme on its front-matter line', () => {
    expect(error(md('---', 'title: T', 'theme: neon', '---', '# Hi'))).toBe(
      'Line 3: Unknown theme “neon”. Use room-dark or room-light or studio.',
    )
  })
})

describe('parsePresentation: table and before/after', () => {
  const error = (source: string) => {
    try {
      parsePresentation(source)
    } catch (e) {
      return (e as Error).message
    }
    return 'no error'
  }

  it('turns a GFM table into a table with its header and rows', () => {
    const [slide] = parsePresentation(
      md(
        '# Where the **time** goes',
        '',
        '| Task | Hours |',
        '| --- | ---: |',
        '| Writing | 3 |',
        '| **Review** | 1 |',
      ),
    ).slides
    expect(slide).toEqual({
      kind: 'table',
      title: '',
      label: '',
      footer: '',
      layout: 'auto',
      heading: [{ text: 'Where the ' }, { text: 'time', highlight: true }, { text: ' goes' }],
      body: '',
      header: ['Task', 'Hours'],
      rows: [
        ['Writing', '3'],
        ['**Review**', '1'],
      ],
    })
  })

  it('rejects a table with only a header row', () => {
    expect(error(md('# T', '', '| Name | Role |', '| --- | --- |'))).toBe(
      'Line 3: Add at least one row under the table’s header.',
    )
  })

  it('caps a table at 5 columns and 6 rows', () => {
    const row = (n: number) => `| ${Array.from({ length: n }, (_, i) => `c${i}`).join(' | ')} |`
    const sep = (n: number) => `|${' --- |'.repeat(n)}`
    expect(error(md('# T', '', row(5), sep(5), ...Array(6).fill(row(5))))).toBe('no error')
    expect(error(md('# T', '', row(6), sep(6), row(6)))).toBe(
      'Line 3: Use at most 5 columns in a table.',
    )
    expect(error(md('# T', '', row(2), sep(2), ...Array(7).fill(row(2))))).toBe(
      'Line 3: Use at most 6 rows in a table (not counting the header).',
    )
  })

  it('turns a Before | After table into before/after, ignoring case', () => {
    const [slide] = parsePresentation(
      md(
        '# One **idea** per slide',
        '',
        '| before | AFTER |',
        '| --- | --- |',
        '| Dense slides nobody reads | One idea, **big** type |',
      ),
    ).slides
    expect(slide).toEqual({
      kind: 'before-after',
      title: '',
      label: '',
      footer: '',
      layout: 'auto',
      heading: [{ text: 'One ' }, { text: 'idea', highlight: true }, { text: ' per slide' }],
      body: '',
      before: 'Dense slides nobody reads',
      after: 'One idea, **big** type',
    })
  })

  it('rejects a before/after with more or fewer than one row', () => {
    expect(
      error(md('# BA', '', '| Before | After |', '| --- | --- |', '| a | b |', '| c | d |')),
    ).toBe('Line 3: Before/after is a single comparison — use a plain table for more rows.')
    expect(error(md('# BA', '', '| Before | After |', '| --- | --- |'))).toBe(
      'Line 3: Add one row under Before | After with the two things to compare.',
    )
  })
})

describe('parsePresentation: chart', () => {
  const error = (source: string) => {
    try {
      parsePresentation(source)
    } catch (e) {
      return (e as Error).message
    }
    return 'no error'
  }

  it('turns an annotated table into a chart, first column as labels and the rest as series', () => {
    const [slide] = parsePresentation(
      md(
        '# Visits **doubled**',
        '',
        '<!-- chart: type=bar -->',
        '| Month | Visits | Signups |',
        '| --- | --- | --- |',
        '| Jan | 120 | 8 |',
        '| Feb | 1,450 | 12.5 |',
      ),
    ).slides
    expect(slide).toEqual({
      kind: 'chart',
      title: '',
      label: '',
      footer: '',
      layout: 'auto',
      heading: [{ text: 'Visits ' }, { text: 'doubled', highlight: true }],
      body: '',
      type: 'bar',
      labels: ['Jan', 'Feb'],
      series: [
        { name: 'Visits', values: [120, 1450] },
        { name: 'Signups', values: [8, 12.5] },
      ],
    })
  })

  it('uses the x column for labels and the y column as the only series', () => {
    const [slide] = parsePresentation(
      md(
        '# Revenue',
        '',
        '<!-- chart: type=line x=Quarter y=Revenue -->',
        '| Region | Quarter | Revenue | Cost |',
        '| --- | --- | --- | --- |',
        '| EU | Q1 | 10 | 4 |',
        '| EU | Q2 | 14 | 5 |',
      ),
    ).slides
    expect(slide).toMatchObject({
      kind: 'chart',
      type: 'line',
      labels: ['Q1', 'Q2'],
      series: [{ name: 'Revenue', values: [10, 14] }],
    })
  })

  it('with only x given, charts every other column', () => {
    const [slide] = parsePresentation(
      md(
        '# Costs',
        '',
        '<!-- chart: type=bar x=Quarter -->',
        '| Cost | Quarter | Revenue |',
        '| --- | --- | --- |',
        '| 4 | Q1 | 10 |',
      ),
    ).slides
    expect(slide).toMatchObject({
      labels: ['Q1'],
      series: [
        { name: 'Cost', values: [4] },
        { name: 'Revenue', values: [10] },
      ],
    })
  })

  const table = ['| Month | Visits |', '| --- | --- |', '| Jan | 1 |']

  it('requires type=bar or type=line', () => {
    expect(error(md('# C', '', '<!-- chart -->', ...table))).toBe(
      'Line 3: A chart needs type=bar or type=line.',
    )
    expect(error(md('# C', '', '<!-- chart: type=pie -->', ...table))).toBe(
      'Line 3: A chart needs type=bar or type=line.',
    )
  })

  it('needs a table under the chart annotation', () => {
    expect(error(md('# C', '', '<!-- chart: type=bar -->', '- Jan 1'))).toBe(
      'Line 4: Put a table directly under <!-- chart -->.',
    )
  })

  it('caps a chart at 5 columns and 6 rows', () => {
    const cap =
      'Line 4: A chart supports at most 5 columns and 6 rows. Trim the table or split the slide.'
    const wide = [
      '| a | b | c | d | e | f |',
      '|---|---|---|---|---|---|',
      '| x | 1 | 2 | 3 | 4 | 5 |',
    ]
    expect(error(md('# C', '', '<!-- chart: type=bar -->', ...wide))).toBe(cap)
    const tall = Array.from({ length: 7 }, (_, i) => `| m${i} | ${i} |`)
    expect(
      error(
        md('# C', '', '<!-- chart: type=line -->', '| Month | Visits |', '| --- | --- |', ...tall),
      ),
    ).toBe(cap)
    const six = tall.slice(0, 6)
    expect(
      error(
        md('# C', '', '<!-- chart: type=line -->', '| Month | Visits |', '| --- | --- |', ...six),
      ),
    ).toBe('no error')
  })

  it('rejects x or y naming a column the table does not have', () => {
    expect(error(md('# C', '', '<!-- chart: type=bar y=Sales -->', ...table))).toBe(
      'Line 3: The table has no “Sales” column. Use one of: Month, Visits.',
    )
    expect(error(md('# C', '', '<!-- chart: type=bar x=Day -->', ...table))).toBe(
      'Line 3: The table has no “Day” column. Use one of: Month, Visits.',
    )
  })

  it('points annotation errors at the first line of a multi-line chart comment', () => {
    expect(error(md('# C', '', '<!-- chart:', '  type=pie', '-->', ...table))).toBe(
      'Line 3: A chart needs type=bar or type=line.',
    )
    expect(error(md('# C', '', '<!-- chart:', '  type=bar', '  y=Sales -->', ...table))).toBe(
      'Line 3: The table has no “Sales” column. Use one of: Month, Visits.',
    )
  })

  it('needs at least one data column', () => {
    expect(
      error(md('# C', '', '<!-- chart: type=bar -->', '| Month |', '| --- |', '| Jan |')),
    ).toBe('Line 4: A chart needs a label column and at least one number column.')
  })

  it('lets the annotation win over shape detection for a Before | After table', () => {
    const [slide] = parsePresentation(
      md('# C', '', '<!-- chart: type=bar -->', '| Before | After |', '| --- | --- |', '| x | 3 |'),
    ).slides
    expect(slide).toMatchObject({
      kind: 'chart',
      labels: ['x'],
      series: [{ name: 'After', values: [3] }],
    })
  })

  it('rejects a chart with only a header row', () => {
    expect(
      error(md('# C', '', '<!-- chart: type=bar -->', '| Month | Visits |', '| --- | --- |')),
    ).toBe('Line 4: Add at least one row of data under the chart’s header.')
  })

  it('rejects a chart row with a blank label', () => {
    expect(
      error(
        md(
          '# C',
          '',
          '<!-- chart: type=bar -->',
          '| Month | Visits |',
          '| --- | --- |',
          '| Jan | 1 |',
          '|  | 2 |',
        ),
      ),
    ).toBe('Line 7: Give every row a label in the Month column.')
  })

  it('rejects a data cell that is not a number', () => {
    expect(
      error(
        md(
          '# C',
          '',
          '<!-- chart: type=bar -->',
          '| Month | Visits |',
          '| --- | --- |',
          '| Jan | 1 |',
          '| Feb | lots |',
        ),
      ),
    ).toBe('Line 7: “lots” in the Visits column isn’t a number.')
  })
})

describe('parsePresentation: buttons', () => {
  const error = (source: string) => {
    try {
      parsePresentation(source)
    } catch (e) {
      return (e as Error).message
    }
    return 'no error'
  }

  it('turns an annotated bullet list of links into buttons', () => {
    const [slide] = parsePresentation(
      md(
        '# Try it **yourself**',
        '',
        '<!-- buttons -->',
        '- [View the repo](https://github.com/example/repo)',
        '- [See the product](https://example.com)',
      ),
    ).slides
    expect(slide).toEqual({
      kind: 'buttons',
      title: '',
      label: '',
      footer: '',
      layout: 'auto',
      heading: [{ text: 'Try it ' }, { text: 'yourself', highlight: true }],
      body: '',
      buttons: [
        { label: 'View the repo', url: 'https://github.com/example/repo' },
        { label: 'See the product', url: 'https://example.com' },
      ],
    })
  })

  it('flattens formatted link text into the button label', () => {
    const [slide] = parsePresentation(
      md('# Go', '', '<!-- buttons -->', '- [*Go* now `today`](https://x.com)'),
    ).slides
    expect(slide).toMatchObject({ buttons: [{ label: 'Go now today', url: 'https://x.com' }] })
  })

  it('caps buttons at three', () => {
    const links = ['a', 'b', 'c', 'd'].map(x => `- [${x}](https://example.com/${x})`)
    expect(error(md('# Go', '', '<!-- buttons -->', ...links))).toBe(
      'Line 4: Use at most 3 buttons.',
    )
  })

  it('rejects a button link that is not https://', () => {
    expect(
      error(
        md(
          '# Go',
          '',
          '<!-- buttons -->',
          '- [Repo](https://example.com)',
          '- [Docs](http://example.com)',
        ),
      ),
    ).toBe('Line 5: Button links must be https:// URLs.')
  })

  it('rejects a bullet that is not a single link', () => {
    expect(
      error(md('# Go', '', '<!-- buttons -->', '- [Repo](https://example.com)', '- just text')),
    ).toBe('Line 5: Each button must be a single [Label](https://...) link.')
  })

  it('rejects a buttons annotation above something other than a bullet list', () => {
    expect(error(md('# Go', '', '<!-- buttons -->', '1. [Repo](https://example.com)'))).toBe(
      'Line 4: Buttons must be a bullet list of [Label](https://...) links.',
    )
  })
})

describe('parsePresentation: flow', () => {
  const error = (source: string) => {
    try {
      parsePresentation(source)
    } catch (e) {
      return (e as Error).message
    }
    return 'no error'
  }
  const flow = (...bullets: string[]) => md('# How it **moves**', '', '<!-- flow -->', ...bullets)

  it('turns an annotated bullet list of arrow chains into a flow', () => {
    expect(parsePresentation(flow('- Write -> Parse -> Present')).slides[0]).toMatchObject({
      kind: 'flow',
      lines: [['Write', 'Parse', 'Present']],
    })
  })

  it('keeps a converging pair and a parallel pair as two chains', () => {
    expect(
      parsePresentation(flow('- Notes -> Draft -> Presentation', '- Data -> Presentation'))
        .slides[0],
    ).toMatchObject({
      lines: [
        ['Notes', 'Draft', 'Presentation'],
        ['Data', 'Presentation'],
      ],
    })
    expect(parsePresentation(flow('- Plan -> Build', '- Test -> Ship')).slides[0]).toMatchObject({
      lines: [
        ['Plan', 'Build'],
        ['Test', 'Ship'],
      ],
    })
  })

  it('caps a flow at 2 lines of up to 4 boxes each', () => {
    const message = 'Line 4: A flow supports at most 2 lines of up to 4 boxes each.'
    expect(error(flow('- A -> B', '- C -> D', '- E -> F'))).toBe(message)
    expect(error(flow('- A -> B -> C -> D -> E'))).toBe(message)
  })

  it('rejects a flow that is not a bullet list of chains', () => {
    expect(error(flow('1. A -> B'))).toBe(
      'Line 4: A flow is a bullet list of chains such as - Write -> Parse -> Present.',
    )
    expect(error(flow('- A -> -> B'))).toBe(
      'Line 4: Every box in a flow needs text, e.g. - Write -> Parse -> Present.',
    )
  })

  it('rejects a flow that loops back to an earlier box', () => {
    const message =
      'Line 4: A flow can’t loop back to an earlier box. Give the boxes different text.'
    expect(error(flow('- A -> B -> A'))).toBe(message)
    expect(error(flow('- A -> B', '- B -> A'))).toBe(message)
  })
})

describe('setPresentationTheme', () => {
  it('replaces the theme line in the front matter', () => {
    expect(
      setPresentationTheme(md('---', 'title: T', 'theme: room-dark', '---', '# Hi'), 'room-light'),
    ).toBe(md('---', 'title: T', 'theme: room-light', '---', '# Hi'))
  })

  it('adds a theme line to front matter that has none', () => {
    expect(setPresentationTheme(md('---', 'title: T', '---', '# Hi'), 'room-light')).toBe(
      md('---', 'title: T', 'theme: room-light', '---', '# Hi'),
    )
  })

  it('adds front matter to a presentation that has none', () => {
    const next = setPresentationTheme(md('# Hi', '', 'Body.'), 'room-light')
    expect(next).toBe(md('---', 'theme: room-light', '---', '', '# Hi', '', 'Body.'))
    expect(parsePresentation(next).theme).toBe('room-light')
  })

  it('leaves an indented theme key alone', () => {
    expect(
      setPresentationTheme(
        md('---', 'x:', '  theme: y', 'theme: room-dark', '---', '# Hi'),
        'room-light',
      ),
    ).toBe(md('---', 'x:', '  theme: y', 'theme: room-light', '---', '# Hi'))
  })
})

describe('setFrontMatter', () => {
  it('removes a key when the value is undefined', () => {
    expect(setFrontMatter(md('---', 'title: T', 'scale: hero', '---', '# Hi'), 'scale')).toBe(
      md('---', 'title: T', '---', '# Hi'),
    )
    expect(setFrontMatter(md('# Hi'), 'scale')).toBe('# Hi')
  })

  it('edits autoplay settings inside the autoplay block', () => {
    const source = md(
      '---',
      'title: T',
      'autoplay:',
      '  duration: 12s',
      '  loop: true',
      '---',
      '# Hi',
    )
    const longer = setFrontMatter(source, 'duration', '20s')
    expect(longer).toBe(
      md('---', 'title: T', 'autoplay:', '  duration: 20s', '  loop: true', '---', '# Hi'),
    )
    expect(parsePresentation(longer).duration).toBe(20)
    expect(setFrontMatter(setFrontMatter(source, 'loop'), 'duration')).toBe(
      md('---', 'title: T', '---', '# Hi'),
    )
  })

  it('keeps settings apart between presentations', () => {
    const teal = setFrontMatter(md('---', 'title: A', '---', '# Hi'), 'tone', 'teal')
    expect(parsePresentation(teal).tone).toBe('#4fd1c5')
    expect(parsePresentation(md('---', 'title: B', '---', '# Hi')).tone).toBe(
      defaultTone('room-dark'),
    )
  })
})

describe('slideLines', () => {
  it('gives the first written line of each slide, skipping empty ones', () => {
    const source = '---\ntitle: T\n---\n\n# One\n\n---\n\n---\n\n```\n---\n```\n# Two\n'
    expect(slideLines(source)).toEqual([5, 11])
  })

  it('works on text that does not parse', () => {
    expect(slideLines('# One\n\n---\n\n```\nopen')).toEqual([1, 5])
  })
})

describe('replaceSlide', () => {
  const source =
    '---\ntitle: T\n---\n\n# One\n\nWordy text.\n\n---\n\n# Two\n\n---\n\n```\n---\n```\n# Three\n'

  it('reads one slide without the separators around it', () => {
    expect(slideSource(source, 0)).toBe('# One\n\nWordy text.')
    expect(slideSource(source, 2)).toBe('```\n---\n```\n# Three')
    expect(slideSource(source, 3)).toBe('')
  })

  it('swaps one slide by index and leaves every other byte alone', () => {
    const next = replaceSlide(source, 0, '\n# Short\n')
    expect(next).toBe(source.replace('# One\n\nWordy text.', '# Short'))
    expect(parsePresentation(next).slides).toHaveLength(3)
  })

  it('splits one slide into two', () => {
    const next = replaceSlide(source, 1, '# Two A\n\n---\n\n# Two B')
    expect(parsePresentation(next).slides).toHaveLength(4)
    expect(slideSource(next, 2)).toBe('# Two B')
    expect(slideSource(next, 3)).toBe(slideSource(source, 2))
  })

  it('refuses a slide that is not there', () => {
    expect(() => replaceSlide(source, 5, '# Five')).toThrow('There is no slide 6.')
  })
})

describe('insertSlide and removeSlide', () => {
  const source =
    '---\ntitle: T\n---\n\n# One\n\nWordy text.\n\n---\n\n# Two\n\n---\n\n```\n---\n```\n# Three\n'

  it('adds a slide right after the given one', () => {
    const next = insertSlide(source, 0, '# New\n')
    expect(parsePresentation(next).slides).toHaveLength(4)
    expect(slideSource(next, 1)).toBe('# New')
    expect(slideSource(next, 2)).toBe('# Two')
  })

  it('adds a slide at the end after the last one', () => {
    const next = insertSlide(source, 2, '# Four')
    expect(next).toBe(source.replace('# Three\n', '# Three\n\n---\n\n# Four\n'))
  })

  it('removes a slide with its separator and keeps the rest', () => {
    expect(removeSlide(source, 1)).toBe(source.replace('# Two\n\n---\n\n', ''))
    expect(removeSlide(source, 0)).toBe(source.replace('# One\n\nWordy text.\n\n---\n\n', ''))
    expect(removeSlide(source, 2)).toBe(source.replace('\n\n---\n\n```\n---\n```\n# Three', ''))
  })

  it('undoes an insert by removing the new slide', () => {
    expect(removeSlide(insertSlide(source, 1, '# New'), 2)).toBe(source)
  })

  it('keeps the last slide', () => {
    expect(() => removeSlide('# Only\n', 0)).toThrow('A presentation needs at least one slide.')
  })
})
