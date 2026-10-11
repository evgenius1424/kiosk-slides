import type { Image, RootContent } from 'mdast'
import { defineWidget } from './types'

export type ImageWidget = { kind: 'image'; src: string; alt: string; caption: string }

/** The image in a paragraph that holds nothing but one image. */
const imageOf = (node: RootContent): Image | undefined => {
  if (node.type !== 'paragraph') return undefined
  const parts = node.children.filter(child => !(child.type === 'text' && !child.value.trim()))
  return parts.length === 1 && parts[0].type === 'image' ? parts[0] : undefined
}

/** A markdown image `![alt](src "caption")` on its own line. */
export const image = defineWidget<ImageWidget>({
  kind: 'image',
  matches: ({ node }) => imageOf(node) !== undefined,
  parse: ({ node, fail }) => {
    const found = imageOf(node) ?? fail('Put the image on its own line: ![alt](src "caption").')
    if (!/^(data:image\/(png|jpeg|webp);base64,|https:\/\/|\/images\/)/.test(found.url)) fail('Use an HTTPS image URL or embedded image data.')
    const alt = found.alt ?? ''; const caption = found.title ?? ''
    if (alt.length > 450 || caption.length > 450) fail('Supporting content is too long. Shorten it or split the slide.')
    return { kind: 'image', src: found.url, alt, caption }
  },
})
