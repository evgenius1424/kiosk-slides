import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { systemPrompt } from '@/lib/chat-prompt'

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8').trim()

describe('chat system prompt', () => {
  it('teaches the format from FORMAT.md and shows public/example.md', async () => {
    const prompt = await systemPrompt()
    expect(prompt).toContain(read('FORMAT.md'))
    expect(prompt).toContain(`<example>\n${read('public/example.md')}\n</example>`)
    expect(prompt).toContain('<deck></deck>')
  })

  it('has no leftover colon-fence directive syntax', async () => {
    expect(await systemPrompt()).not.toContain(':'.repeat(3))
  })
})
