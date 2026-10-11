import type { SlideOfKind } from '@/lib/presentation'

// Plot area inside a fixed viewBox; the SVG scales with the slide.
const width = 600,
  height = 300,
  left = 8,
  right = 8,
  top = 12,
  bottom = 40
const plotWidth = width - left - right,
  plotHeight = height - top - bottom

/**
 * A small inline SVG bar or line chart, values scaled from zero. The parser caps a chart at 6 body rows
 * (≤6 labels) and 5 columns, one of which is the label column, so there are at most 4 series.
 */
export function ChartView({ slide }: { slide: SlideOfKind<'chart'> }) {
  const { type, labels, series } = slide
  const values = series.flatMap(s => s.values)
  const min = Math.min(0, ...values),
    max = Math.max(0, ...values)
  const span = max - min || 1
  const yOf = (value: number) => top + (plotHeight * (max - value)) / span
  const slot = plotWidth / Math.max(labels.length, 1)
  const xOf = (i: number) => left + slot * (i + 0.5)
  const barWidth = (slot * 0.7) / Math.max(series.length, 1)

  return (
    <figure className="slide-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={series.map(s => s.name).join(', ')}
      >
        <line className="chart-axis" x1={left} x2={width - right} y1={yOf(0)} y2={yOf(0)} />
        {type === 'bar'
          ? series.map((s, si) =>
              s.values.map((value, i) => {
                const x = xOf(i) - (barWidth * series.length) / 2 + barWidth * si
                return (
                  <rect
                    key={`${si}-${i}`}
                    className={`chart-bar s${si}`}
                    x={x + 1}
                    width={barWidth - 2}
                    y={Math.min(yOf(value), yOf(0))}
                    height={Math.abs(yOf(value) - yOf(0))}
                    rx={3}
                  >
                    <title>{`${s.name} ${labels[i]}: ${value}`}</title>
                  </rect>
                )
              }),
            )
          : series.map((s, si) => (
              <g key={si} className={`s${si}`}>
                <polyline
                  className="chart-line"
                  points={s.values.map((value, i) => `${xOf(i)},${yOf(value)}`).join(' ')}
                />
                {s.values.map((value, i) => (
                  <circle key={i} className="chart-point" cx={xOf(i)} cy={yOf(value)} r={6}>
                    <title>{`${s.name} ${labels[i]}: ${value}`}</title>
                  </circle>
                ))}
              </g>
            ))}
        {labels.map((label, i) => (
          <text key={i} className="chart-label" x={xOf(i)} y={height - 12} textAnchor="middle">
            {label}
          </text>
        ))}
      </svg>
      <ul className="chart-legend">
        {series.map((s, si) => (
          <li key={si}>
            <span className={`s${si}`} />
            {s.name}
          </li>
        ))}
      </ul>
    </figure>
  )
}
