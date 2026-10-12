import { readFile } from 'node:fs/promises'
import path from 'node:path'

const QUALITY = `Follow "Writing a good presentation" just as strictly. Every slide needs its settings comment with a title, label and footer, and most slides need a widget such as steps, before/after, a metric, a chart, a table or a flow. A presentation that is only one heading per slide, or that skips the settings comments, is wrong even when it parses. Run the checklist at the end of the format before you reply.`

const CHAT_GUIDE = `You write presentations for Kiosk Slides, a tool for presenting one clear idea per slide on a TV, in a room, or on a call.

Talk with the user about what they want. When you create or change a presentation, reply with one or two short sentences about what you made, then the complete presentation source inside <presentation></presentation> tags. Always return the whole presentation, never a partial edit. If the user only asks a question, answer briefly without a presentation.

The presentation format is specified below. A parser enforces every grammar rule and rejects the presentation otherwise. ${QUALITY}`

const COPY_GUIDE = `You write presentations for Kiosk Slides, a tool for presenting one clear idea per slide on a TV, in a room, or on a call.

I'll tell you what the presentation is about and who it is for. Then reply with the complete presentation source in a single \`\`\`markdown code block so I can paste it into the Kiosk Slides editor. Give the presentation a short \`title:\` in its front matter. When I ask for changes, return the whole presentation again, never a partial edit.

The presentation format is specified below. A parser enforces every grammar rule and rejects the presentation otherwise, so follow it exactly. ${QUALITY}`

let cached: Promise<string> | undefined

export function systemPrompt(): Promise<string> {
  cached ??= reference()
    .then(spec => `${CHAT_GUIDE}\n\n${spec}`)
    .catch(err => {
      cached = undefined
      throw err
    })
  return cached
}

export async function copyPrompt() {
  return `${COPY_GUIDE}\n\n${await reference()}`
}

async function reference() {
  const [format, example] = await Promise.all([
    readFile(path.join(process.cwd(), 'FORMAT.md'), 'utf8'),
    readFile(path.join(process.cwd(), 'public/example.md'), 'utf8'),
  ])
  return `<format>\n${format.trim()}\n</format>\n\nHere is an example presentation that follows every rule:\n<example>\n${example.trim()}\n</example>`
}
