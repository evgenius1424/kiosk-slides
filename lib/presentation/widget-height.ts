import type { Widget } from './components'
import type { MessageWidget } from './types'

type WidgetText = {
  width: number
  list: number
  quote: number
  small: number
  caption: number
}

export const WIDGET_GAP = 2.5

export function widgetHeight(
  widget: Widget | MessageWidget,
  text: WidgetText,
  charWidth: number,
): number {
  const lines = (value: string, width: number, size: number) =>
    wrapped(value, width / (charWidth * size))
  switch (widget.kind) {
    case 'message':
    case 'code':
      return 0
    case 'steps':
      return list(
        widget.steps.map(step => lines(step, text.width - 4.5, text.list)),
        text.list,
      )
    case 'bullets':
      return list(
        widget.items.map(item => lines(item, text.width - 3, text.list)),
        text.list,
      )
    case 'checklist':
      return list(
        widget.items.map(item => lines(item.text, text.width - 3.8, text.list)),
        text.list,
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
      const width = text.width / widget.header.length - 3.2
      const rows = widget.rows.map(row => Math.max(1, ...row.map(cell => lines(cell, width, 2))))
      return 4.25 + rows.reduce((sum, count) => sum + 2.05 + count * 2.7, 0)
    }
    case 'buttons': {
      const used = widget.buttons.reduce(
        (sum, button) => sum + button.label.length * charWidth * text.small + 9.3,
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

function list(rows: number[], size: number) {
  return rows.reduce((sum, count) => sum + count, 0) * size * 1.4 + (rows.length - 1) * 1.7
}

function wrapped(text: string, perLine: number) {
  return text
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / perLine)), 0)
}
