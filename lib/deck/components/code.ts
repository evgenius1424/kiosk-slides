import { messages } from './shared'
import { defineWidget } from './types'

export type CodeWidget = { kind: 'code'; language: string; code: string }

/** A fenced code block; the language comes from the fence info string. */
export const code = defineWidget<CodeWidget>({
  kind: 'code',
  matches: ({ node }) => node.type === 'code',
  parse: ({ node, fail }) => {
    if (node.type !== 'code') return fail('Code must be a fenced code block.')
    if (node.value.split('\n').length > 12) fail('Shorten code to 12 lines or split this slide.')
    if (node.value.length > 450) fail(messages.tooLong)
    return { kind: 'code', language: node.lang ?? '', code: node.value }
  },
})
