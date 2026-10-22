import type { Widget } from './components'
import type { MessageWidget } from './types'

type WidgetText = {
  width: number
  gap: number
  list: number
  quote: number
  small: number
  caption: number
  table: number
}

export const WIDGET_GAP = 2.5

export function widgetHeight(
  widget: Widget | MessageWidget,
  text: WidgetText,
  charWidth: number,
): number {
  const lines = (value: string, width: number, size: number) =>
    textLines(value, width, size, charWidth)
  switch (widget.kind) {
    case 'message':
    case 'code':
      return 0
    case 'steps':
      return list(
        widget.steps.map(step => lines(step, text.width - 4.5, text.list)),
        text.list,
        text.gap,
      )
    case 'bullets':
      return list(
        widget.items.map(item => lines(item, text.width - 3, text.list)),
        text.list,
        text.gap,
      )
    case 'checklist':
      return list(
        widget.items.map(item => lines(item.text, text.width - 3.8, text.list)),
        text.list,
        text.gap,
      )
    case 'quote':
      return lines(widget.text, 69.6, text.quote) * text.quote * 1.3 + (widget.by ? 3.1 : 0)
    case 'before-after': {
      const width = (text.width - 2) / 2 - 4
      const most = Math.max(
        lines(widget.before, width, text.small),
        lines(widget.after, width, text.small),
      )
      return 6.8 + most * text.small * 1.4
    }
    case 'table': {
      const size = text.table
      const char = (charWidth + 0.04) * TABLE_CHAR
      const widths = columnWidths(widget, text.width, char * size, 1.6 * size)
      const rows = widget.rows.map(row =>
        Math.max(
          1,
          ...widths.map((width, c) => wrapped(plain(row[c] ?? ''), width / (char * size))),
        ),
      )
      return (
        2.1 * size + 0.05 + rows.reduce((sum, count) => sum + size + 0.05 + count * 1.35 * size, 0)
      )
    }
    case 'buttons': {
      const used = widget.buttons.reduce(
        (sum, button) => sum + button.label.length * (charWidth + 0.04) * text.small + 9.3,
        0,
      )
      const rows = Math.ceil(used / text.width)
      return rows * (text.small * 1.3 + 2.8) + (rows - 1) * 1.5
    }
    case 'metric':
      return Math.max(12, lines(widget.caption, 25, text.caption) * text.caption * 1.25)
    case 'flow':
      return widget.lines.length * 5.2 + (widget.lines.length - 1) * 1.6
    case 'image':
      return 22
    case 'chart':
      return 25
  }
}

export function textLines(text: string, width: number, size: number, charWidth: number) {
  const perLine = width / (charWidth * TEXT_CHAR * size)
  return plain(text)
    .split('\n')
    .reduce((sum, line) => sum + wordLines(line, perLine), 0)
}

const TABLE_CHAR = 0.85
const TEXT_CHAR = 0.9

function columnWidths(
  { header, rows }: Extract<Widget, { kind: 'table' }>,
  room: number,
  char: number,
  padding: number,
) {
  const natural = header.map(
    (label, c) =>
      padding +
      Math.max(label.length * (char * 0.8), ...rows.map(row => plain(row[c] ?? '').length * char)),
  )
  const total = natural.reduce((sum, width) => sum + width, 0)
  return natural.map(width => (width * room) / total - padding)
}

function plain(text: string) {
  return text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, '')
}

function list(rows: number[], size: number, gap: number) {
  return rows.reduce((sum, count) => sum + count, 0) * size * 1.4 + (rows.length - 1) * 1.7 * gap
}

function wrapped(text: string, perLine: number) {
  return text
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / perLine)), 0)
}

function wordLines(line: string, perLine: number) {
  let lines = 1
  let used = 0
  for (const word of line.split(/\s+/).filter(Boolean)) {
    if (used && used + 1 + word.length > perLine) {
      lines++
      used = 0
    }
    used += (used ? 1 : 0) + word.length
    while (used > perLine) {
      lines++
      used -= perLine
    }
  }
  return lines
}
