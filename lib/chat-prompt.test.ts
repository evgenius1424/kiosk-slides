import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { copyPrompt, slideCopyPrompt, slideSystemPrompt, systemPrompt } from '@/lib/chat-prompt'

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8').trim()

describe('chat system prompt', () => {
  it('teaches the format from FORMAT.md and shows public/example.md', async () => {
    const prompt = await systemPrompt()
    expect(prompt).toContain(read('FORMAT.md'))
    expect(prompt).toContain(`<example>\n${read('public/example.md')}\n</example>`)
    expect(prompt).toContain('<presentation></presentation>')
    expect(prompt).toContain('Follow "Writing a good presentation" just as strictly')
  })

  it('has no leftover colon-fence directive syntax', async () => {
    expect(await systemPrompt()).not.toContain(':'.repeat(3))
  })
})

describe('copyable prompt', () => {
  it('carries the same format and example as the chat, asking for a pasteable code block', async () => {
    const prompt = await copyPrompt()
    expect(prompt).toContain(read('FORMAT.md'))
    expect(prompt).toContain(read('public/example.md'))
    expect(prompt).toContain('```markdown')
    expect(prompt).not.toContain('<presentation>')
    expect(prompt).toContain('Follow "Writing a good presentation" just as strictly')
  })
})

describe('slide prompts', () => {
  it('asks the chat for only the new slide inside slides tags', async () => {
    const prompt = await slideSystemPrompt()
    expect(prompt).toContain(read('FORMAT.md'))
    expect(prompt).toContain('<slides></slides>')
    expect(prompt).toContain('none of the other slides')
  })

  it('asks any AI chat for a pasteable code block with only the new slide', async () => {
    const prompt = await slideCopyPrompt()
    expect(prompt).toContain(read('public/example.md'))
    expect(prompt).toContain('```markdown')
    expect(prompt).not.toContain('<slides>')
  })
})
