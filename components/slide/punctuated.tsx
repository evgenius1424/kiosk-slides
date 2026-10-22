import { Fragment } from 'react'

export function Punctuated({ text }: { text: string }) {
  const pieces = text.split(punctuation)
  if (pieces.length === 1) return text
  return pieces.map((piece, i) => {
    if (i % 2 === 0) {
      const glued = pieces[i + 1] === '—' ? piece.replace(/ $/, '\u00a0') : piece
      return <Fragment key={i}>{glued}</Fragment>
    }
    const before = pieces[i - 1].at(-1) ?? ' '
    const attached = !/\s/.test(before)
    if (piece === '—' && attached)
      return (
        <Fragment key={i}>
          {'\u2060'}
          <span className="dash">{piece}</span>
        </Fragment>
      )
    return (
      <span key={i} className={kind(piece, attached)}>
        {piece}
      </span>
    )
  })
}

const punctuation = /([—–'’‘"“”%()])/

function kind(mark: string, attached: boolean) {
  if (mark === '—' || mark === '–') return 'opening closing'
  if ('(‘“'.includes(mark) || (mark === '"' && !attached)) return 'opening'
  return 'closing'
}
