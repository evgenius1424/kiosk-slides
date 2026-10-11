import { readFile } from 'node:fs/promises'
import path from 'node:path'

const CHAT_GUIDE = `You write slide decks for Kiosk Slides, a tool for presenting one clear idea per slide on a TV, in a room, or on a call.

Talk with the user about what they want. When you create or change a deck, reply with one or two short sentences about what you made, then the complete deck source inside <deck></deck> tags. Always return the whole deck, never a partial edit. If the user only asks a question, answer briefly without a deck.

The deck format is specified below. A parser enforces every rule and rejects the deck otherwise.`

const read = (file: string) => readFile(path.join(process.cwd(), file), 'utf8')

let cached: Promise<string> | undefined

/** The chat model's instructions: how to reply, the format spec from FORMAT.md, and public/example.md as an example. */
export function systemPrompt(): Promise<string> {
  cached ??= Promise.all([read('FORMAT.md'), read('public/example.md')])
    .then(([format, example]) => `${CHAT_GUIDE}\n\n<format>\n${format.trim()}\n</format>\n\nHere is an example deck that follows every rule:\n<example>\n${example.trim()}\n</example>`)
    .catch(err => { cached = undefined; throw err })
  return cached
}
