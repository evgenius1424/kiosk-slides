import type { Image, RootContent } from 'mdast'
import { messages, onlyChild } from './shared'
import { defineWidget } from './types'

export type ImageWidget = { kind: 'image'; src: string; alt: string; caption: string }

/** The image in a paragraph that holds nothing but one image. */
const imageOf = (node: RootContent): Image | undefined => {
  const child = node.type === 'paragraph' ? onlyChild(node) : undefined
  return child?.type === 'image' ? child : undefined
}

/** A markdown image `![alt](src "caption")` on its own line. */
export const image = defineWidget<ImageWidget>({
  kind: 'image',
  matches: ({ node }) => imageOf(node) !== undefined,
  parse: ({ node, fail }) => {
    const found = imageOf(node) ?? fail('Put the image on its own line: ![alt](src "caption").')
    if (!/^(data:image\/(png|jpeg|webp);base64,|https:\/\/|\/images\/)/.test(found.url))
      fail('Use an HTTPS image URL or embedded image data.')
    const alt = found.alt ?? ''
    const caption = found.title ?? ''
    if (alt.length > 450 || caption.length > 450) fail(messages.tooLong)
    return { kind: 'image', src: found.url, alt, caption }
  },
})
