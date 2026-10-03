'use client'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { formatValue, type ValueFormat } from './format'

export type SeriesPoint = { label: string; values: number[] }

/**
 * Time-series area chart with a crosshair tooltip.
 *
 * Hand-drawn SVG rather than a charting library: it keeps the bundle small and
 * makes the chart easy for a buyer to restyle. Supports one or two series on a
 * single shared y-axis (never a second axis — that invents correlations).
 */
export function AreaChart({
  data,
  series,
  height = 220,
  format = 'number',
  currencySymbol = '$',
  className,
}: {
  data: SeriesPoint[]
  series: { name: string; color: string }[]
  height?: number
  /** Serializable format name — see src/components/charts/format.ts. */
  format?: ValueFormat
  currencySymbol?: string
  className?: string
}) {
  const label = (value: number) => formatValue(value, format, currencySymbol)
  const [hover, setHover] = useState<number | null>(null)

  const PAD = { top: 16, right: 12, bottom: 26, left: 46 }
  const WIDTH = 720
  const plotWidth = WIDTH - PAD.left - PAD.right
  const plotHeight = height - PAD.top - PAD.bottom

  const { max, ticks } = useMemo(() => {
    const peak = Math.max(1, ...data.flatMap((point) => point.values))
    // Round the axis up to a clean number so ticks read as 0 / 500 / 1,000.
    const magnitude = Math.pow(10, Math.floor(Math.log10(peak)))
    const rounded = Math.ceil(peak / (magnitude / 2)) * (magnitude / 2)
    return { max: rounded, ticks: [0, rounded / 2, rounded] }
  }, [data])

  const x = (index: number) =>
    PAD.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth)
  const y = (value: number) => PAD.top + plotHeight - (value / max) * plotHeight

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted"
        style={{ height }}
      >
        No data for this period yet.
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-4">
          {series.map((entry) => (
            <span key={entry.name} className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} aria-hidden />
              {entry.name}
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="w-full"
          style={{ height }}
          role="img"
          aria-label={`${series.map((s) => s.name).join(' and ')} over ${data.length} days`}
          onMouseLeave={() => setHover(null)}
        >
          {/* Hairline gridlines, recessive */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="rgb(var(--viz-grid))"
                strokeWidth="1"
              />
              <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-current text-[10px] text-muted">
                {label(tick)}
              </text>
            </g>
          ))}

          {series.map((entry, seriesIndex) => {
            const points = data.map((point, index) => `${x(index)},${y(point.values[seriesIndex] ?? 0)}`)
            const areaPath = `M ${PAD.left},${y(0)} L ${points.join(' L ')} L ${x(data.length - 1)},${y(0)} Z`
            return (
              <g key={entry.name}>
                <path d={areaPath} fill={entry.color} opacity="0.1" />
                <polyline
                  points={points.join(' ')}
                  fill="none"
                  stroke={entry.color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {/* End marker, ringed in the surface colour so it stays legible */}
                <circle
                  cx={x(data.length - 1)}
                  cy={y(data[data.length - 1].values[seriesIndex] ?? 0)}
                  r="4"
                  fill={entry.color}
                  stroke="rgb(var(--surface))"
                  strokeWidth="2"
                />
              </g>
            )
          })}

          {/* Crosshair */}
          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + plotHeight}
              stroke="rgb(var(--viz-grid))"
              strokeWidth="1"
            />
          )}

          {/* Invisible hit areas — wider than the marks, so hovering is easy */}
          {data.map((point, index) => (
            <rect
              key={point.label + index}
              x={x(index) - plotWidth / data.length / 2}
              y={PAD.top}
              width={plotWidth / data.length}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setHover(index)}
            />
          ))}

          {/* X labels — thinned so they never collide */}
          {data.map((point, index) =>
            index % Math.ceil(data.length / 6) === 0 || index === data.length - 1 ? (
              <text
                key={point.label}
                x={x(index)}
                y={height - 8}
                textAnchor="middle"
                className="fill-current text-[10px] text-muted"
              >
                {point.label}
              </text>
            ) : null,
          )}
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-line bg-elevated px-2.5 py-2 shadow-pop"
            style={{ left: `${(x(hover) / WIDTH) * 100}%`, top: 0 }}
          >
            <p className="mb-1 text-[11px] font-medium text-ink">{data[hover].label}</p>
            {series.map((entry, index) => (
              <p key={entry.name} className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: entry.color }} />
                {entry.name}: <span className="font-medium text-ink">{label(data[hover].values[index] ?? 0)}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
