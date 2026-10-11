import type { Parent, RootContent } from 'mdast'

/** Messages more than one rule throws, defined once so they stay identical. */
export const messages = {
  tooLong: 'Supporting content is too long. Shorten it or split the slide.',
  flattenList: 'Flatten the list — nesting isn’t supported.',
}

/** The one meaningful child of `parent`, ignoring whitespace-only text, or undefined if there are zero or several. */
export const onlyChild = (parent: Parent): RootContent | undefined => {
  const parts = parent.children.filter(child => !(child.type === 'text' && !child.value.trim()))
  return parts.length === 1 ? parts[0] : undefined
}
