import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  copyPrompt,
  draftSystemPrompt,
  slideCopyPrompt,
  slideSystemPrompt,
  systemPrompt,
} from '@/lib/chat-prompt'
import {
  avoided,
  avoidedWording,
  languages,
  parsePresentation,
  reviewPresentation,
  slideWords,
  terms,
} from '@/lib/presentation'
import messages from '@/messages/en.json'

const surfaces: Record<string, () => string | Promise<string>> = {
  'site copy': () => strings(messages).join('\n'),
  'parser diagnostics': () => diagnostics().join('\n'),
  'slide words': () => strings(slideWords.en).join('\n'),
  'AI prompts': async () =>
    (
      await Promise.all([
        systemPrompt(),
        copyPrompt(),
        draftSystemPrompt(),
        slideSystemPrompt(),
        slideCopyPrompt(),
      ])
    ).join('\n'),
  'README.md': () => read('README.md'),
  'FORMAT.md': () => read('FORMAT.md'),
  'public/example.md': () => read('public/example.md'),
  'skill instructions': () => read('skills/kiosk-slides/SKILL.md'),
  'skill format reference': () => read('skills/kiosk-slides/references/FORMAT.md'),
  'skill example': () => read('skills/kiosk-slides/references/example.md'),
  'plugin manifests': () =>
    read('.claude-plugin/plugin.json') + read('.claude-plugin/marketplace.json'),
}

describe('presentation language', () => {
  it('names every glossary term and the words it avoids', () => {
    const named = Object.fromEntries(
      Object.entries(terms).map(([concept, name]) => [
        name.toLowerCase(),
        [...(avoided[concept as keyof typeof terms] ?? [])].sort(),
      ]),
    )
    expect(named).toEqual(glossary())
  })

  it.each(Object.keys(surfaces))('keeps avoided wording out of %s', async surface => {
    expect(avoidedWording(await surfaces[surface]())).toEqual([])
  })

  it('catches avoided wording in any form', () => {
    expect(avoidedWording('Export the slide decks, or zoom in').map(m => m.use)).toEqual([
      'presentation',
      'presentation',
      'scale',
      'Download',
    ])
  })

  it('tells presentation source from a saved presentation', () => {
    expect(messages.Workspace.editor.label).toBe(sentence(terms.presentationSource))
    expect(messages.Workspace.toast.kept).toContain(`${terms.savedPresentation}s`)
    expect(messages.Workspace.shared.keepHint).toContain(`${terms.savedPresentation}s`)
  })

  it('tells the presentation title from the presentation name', () => {
    expect(messages.PresentationMenu.nameField).toBe(sentence(terms.presentationName))
    expect(review()[0]).toContain(terms.presentationTitle)
    expect(read('FORMAT.md')).toContain(`\`title:\` is the ${terms.presentationTitle}`)
  })

  it('tells the presentation title from a slide title', () => {
    expect(review()[1]).toContain(terms.slideTitle)
    expect(review()[1]).not.toContain(terms.presentationTitle)
    expect(read('FORMAT.md')).toContain(`\`title\` is the ${terms.slideTitle}`)
  })

  it('groups theme, tone, font, scale and brand under Look', () => {
    const { Settings } = messages
    expect([Settings.look, Settings.theme, Settings.tone, Settings.font, Settings.scale]).toEqual(
      [terms.look, terms.theme, terms.tone, terms.font, terms.scale].map(sentence),
    )
    expect(Settings.brand).toBe(sentence(terms.brand))
  })

  it('keeps Render for the skill and Download for the site', () => {
    expect(messages.Workspace.download).toBe(terms.download)
    expect(strings(messages).join('\n')).not.toMatch(/\brender/i)
    expect(read('skills/kiosk-slides/SKILL.md')).toContain(`## ${terms.render}`)
  })

  it('keeps Present apart from autoplay', () => {
    expect(messages.Workspace.present).toBe(terms.present)
    expect(messages.Shortcuts.items.present.name).toBe(terms.present)
    expect(messages.Shortcuts.items.autoplay.name).toContain(terms.autoplay)
    expect(messages.Workspace.toast.keys).toContain(`to ${terms.autoplay}`)
  })

  it('documents every language the slides speak', () => {
    const [first, ...rest] = languages.map(code => `\`${code}\``)
    expect(read('FORMAT.md')).toContain(
      `\`${terms.language}:\` is ${first} (default) or ${rest.join(', ')}.`,
    )
  })

  it('calls a link a share link, not a saved presentation', () => {
    expect(messages.Workspace.shared.label).toBe(sentence(terms.shareLink))
    expect(messages.Settings.creditHelp).toContain(`${terms.shareLink}s`)
  })
})

function glossary() {
  const entries = read('GLOSSARY.md').matchAll(/^\*\*(.+)\*\*:\n.+(?:\n_Avoid_: (.+))?/gm)
  return Object.fromEntries(
    [...entries].map(([, name, avoid]) => [
      name.toLowerCase(),
      (avoid?.split(',') ?? []).map(word => word.trim().toLowerCase()).sort(),
    ]),
  )
}

function review() {
  const bare = ['# One', '# Two', '# Three', '# Four', '# Five'].join('\n\n---\n\n')
  return reviewPresentation(parsePresentation(bare))
}

function diagnostics() {
  const broken = [
    '',
    `# ${'Long '.repeat(30)}`,
    '<!--\ncolor: teal\n-->\n\n# One',
    '# One\n\n1. First\n\n| A |\n| - |\n| B |',
    '<!-- chart -->\n\n# One',
    '<!-- spinner -->\n# One',
  ]
  return [
    ...review(),
    ...broken.map(source => {
      try {
        parsePresentation(source)
        return ''
      } catch (error) {
        return (error as Error).message
      }
    }),
  ]
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

function sentence(text: string) {
  return text[0].toUpperCase() + text.slice(1)
}

function read(file: string) {
  return readFileSync(path.join(process.cwd(), file), 'utf8')
}
