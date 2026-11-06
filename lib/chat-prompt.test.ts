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
import { parsePresentation } from '@/lib/presentation'

const PRESENTER_KEYS = [
  'theme',
  'transition',
  'share-safe',
  'duration',
  'loop',
  'font',
  'scale',
  'credit',
]

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8').trim()
const guide = read('lib/ai-guide.md')

describe('chat system prompt', () => {
  it('teaches the format from the AI guide and shows the example', async () => {
    const prompt = await systemPrompt()
    expect(prompt).toContain(`<format>\n${guide}\n</format>`)
    expect(prompt).toContain('# Make your point')
    expect(prompt).toContain('<presentation></presentation>')
    expect(prompt).toContain('Follow "Writing a good presentation" just as strictly')
  })

  it('has no leftover colon-fence directive syntax', async () => {
    expect(await systemPrompt()).not.toContain(':'.repeat(3))
  })

  it('shows example tables without padding', async () => {
    const prompt = await systemPrompt()
    expect(prompt).toContain('| Slides | Recall | Viewers |\n| --- | --- | --- |\n| 5 | 82 | 140 |')
    expect(prompt).not.toMatch(/^\|.* {2}/m)
  })

  it('shows an example the parser accepts', async () => {
    const example = (await systemPrompt()).match(/<example>\n([\s\S]*)\n<\/example>/)![1]
    expect(parsePresentation(example).slides.length).toBe(
      parsePresentation(read('public/example.md')).slides.length,
    )
  })
})

describe('copyable prompt', () => {
  it('carries the same guide as the chat, asking for a pasteable code block', async () => {
    const prompt = await copyPrompt()
    expect(prompt).toContain(guide)
    expect(prompt).toContain('```markdown')
    expect(prompt).not.toContain('<presentation>')
    expect(prompt).toContain('Follow "Writing a good presentation" just as strictly')
  })
})

describe('free draft prompt', () => {
  it('leaves out the widgets the draft rejects', async () => {
    const prompt = await draftSystemPrompt()
    expect(prompt).not.toContain('![')
    expect(prompt).not.toContain('<!-- buttons -->')
    expect(prompt).not.toMatch(/^\| (image|buttons) \|/m)
    expect(prompt).not.toMatch(/: (image|buttons)$/m)
    expect(prompt).toContain('| flow |')
  })
})

describe('slide prompts', () => {
  it('asks the chat for only the new slide inside slides tags', async () => {
    const prompt = await slideSystemPrompt()
    expect(prompt).toContain(guide)
    expect(prompt).toContain('<slides></slides>')
    expect(prompt).toContain('none of the other slides')
  })

  it('asks any AI chat for a pasteable code block with only the new slide', async () => {
    const prompt = await slideCopyPrompt()
    expect(prompt).toContain(guide)
    expect(prompt).toContain('```markdown')
    expect(prompt).not.toContain('<slides>')
  })
})

describe('AI guide', () => {
  it('names every slide kind', () => {
    const kinds = parsePresentation(read('public/example.md')).slides.map(s => s.kind)
    for (const kind of new Set(kinds))
      expect(guide).toContain(kind === 'message' ? 'message slide' : `| ${kind} |`)
  })

  it('covers every front matter setting or leaves it to the person presenting', () => {
    const keys = [...read('FORMAT.md').matchAll(/^ {2}- `([a-z-]+):/gm)].map(m => m[1])
    expect(keys.length).toBeGreaterThan(10)
    const missing = keys.filter(
      key => !guide.includes(`\`${key}:`) && !PRESENTER_KEYS.includes(key),
    )
    expect(missing).toEqual([])
  })
})
