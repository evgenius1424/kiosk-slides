import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { SLIDES_CLOSE, SLIDES_OPEN } from './slide-actions'

const QUALITY = `Follow "Writing a good presentation" just as strictly. Every slide needs its settings comment with a title, label and footer, and most slides need a widget such as steps, before/after, a metric, a chart, a table or a flow. A presentation that is only one heading per slide, or that skips the settings comments, is wrong even when it parses. Run the checklist at the end of the format before you reply.`

const SLIDE_RULES = `The presentation format is specified below. A parser enforces every grammar rule and rejects the slide otherwise. Keep the slide's settings comment with a title, a label and a footer, and follow "Writing a good presentation".`

const CHAT_GUIDE = `You write presentations for Kiosk Slides, a tool for presenting one clear idea per slide on a TV, in a room, or on a call.

Talk with the user about what they want. When you create or change a presentation, reply with one or two short sentences about what you made, then the complete presentation source inside <presentation></presentation> tags. Always return the whole presentation, never a partial edit. If the user only asks a question, answer briefly without a presentation.

The presentation format is specified below. A parser enforces every grammar rule and rejects the presentation otherwise. ${QUALITY}`

const COPY_GUIDE = `You write presentations for Kiosk Slides, a tool for presenting one clear idea per slide on a TV, in a room, or on a call.

I'll tell you what the presentation is about and who it is for. Then reply with the complete presentation source in a single \`\`\`markdown code block so I can paste it into the Kiosk Slides editor. Give the presentation a short \`title:\` in its front matter. When I ask for changes, return the whole presentation again, never a partial edit.

The presentation format is specified below. A parser enforces every grammar rule and rejects the presentation otherwise, so follow it exactly. ${QUALITY}`

const SLIDE_GUIDE = `You change one slide of a Kiosk Slides presentation. You get the whole presentation for context, the slide to change, and what to do with it.

Reply with only the new slide inside ${SLIDES_OPEN}${SLIDES_CLOSE} tags: its settings comment and its content, with no front matter and none of the other slides. When the change makes more than one slide, separate them with a line holding only ---.

${SLIDE_RULES}`

const SLIDE_COPY_GUIDE = `You change one slide of a Kiosk Slides presentation. Below I give you the whole presentation for context, the slide to change, and what to do with it.

Reply with only the new slide in a single \`\`\`markdown code block so I can paste it back: its settings comment and its content, with no front matter and none of the other slides. When the change makes more than one slide, separate them with a line holding only ---.

${SLIDE_RULES}`

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

export async function slideSystemPrompt() {
  return `${SLIDE_GUIDE}\n\n${await reference()}`
}

export async function copyPrompt() {
  return `${COPY_GUIDE}\n\n${await reference()}`
}

export async function slideCopyPrompt() {
  return `${SLIDE_COPY_GUIDE}\n\n${await reference()}`
}

async function reference() {
  const [format, example] = await Promise.all([
    readFile(path.join(process.cwd(), 'FORMAT.md'), 'utf8'),
    readFile(path.join(process.cwd(), 'public/example.md'), 'utf8'),
  ])
  return `<format>\n${format.trim()}\n</format>\n\nHere is an example presentation that follows every rule:\n<example>\n${example.trim()}\n</example>`
}
