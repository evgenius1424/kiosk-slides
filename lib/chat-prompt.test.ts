import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { copyPrompt, systemPrompt } from '@/lib/chat-prompt'

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
