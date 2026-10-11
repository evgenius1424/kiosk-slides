import type { Node, RootContent } from 'mdast'
import type { Annotation } from '../annotation'

/** One top-level markdown block of a slide (after the heading/chrome are taken out). */
export type Block = {
  node: RootContent
  /** The `<!-- type: k=v -->` comment directly above this block, if any, with the comment's first line. */
  annotation?: Annotation & { line: number }
  /** Absolute 1-based line number of the block in the presentation source. */
  line: number
  /** Absolute 1-based line number of any node inside this block, e.g. a table row or list item. */
  lineOf: (node: Node) => number
  /** Raw source text spanning the given node(s) of this slide, e.g. to keep inline markdown as written. */
  raw: (nodes: Node | Node[]) => string
  /** Throw a `Line N: message` error; defaults to this block's line. */
  fail: (message: string, line?: number) => never
}

/**
 * A supporting widget kind. Each kind lives in its own module under `lib/presentation/components/`
 * and is registered in `lib/presentation/components/index.ts`.
 *
 * - Unannotated blocks go to the first registered component without an `annotation`
 *   whose `matches` returns true.
 * - A block under `<!-- type ... -->` goes straight to the component whose `annotation`
 *   equals `type`; its `parse` must validate the block's shape itself.
 */
export type WidgetComponent<W extends { kind: string }> = {
  kind: W['kind']
  annotation?: string
  /** The `key=value` settings its annotation accepts. Any other key is an error. Defaults to none. */
  settings?: readonly string[]
  matches?: (block: Block) => boolean
  parse: (block: Block) => W
}

export const defineWidget = <W extends { kind: string }>(component: WidgetComponent<W>) => component

export type WidgetOf<C> = C extends WidgetComponent<infer W> ? W : never
